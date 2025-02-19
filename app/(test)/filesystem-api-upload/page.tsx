"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, File, AlertCircle, ChevronRight, ChevronDown, Check, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
  error?: string;
  uploadStatus?: "pending" | "success" | "error";
  file?: File;
  relativePath?: string;
}

interface TreeNodeProps {
  entry: FileEntry;
  level: number;
  onUpload?: (file: File) => Promise<void>;
}

function TreeNode({ entry, level, onUpload }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = entry.children && entry.children.length > 0;

  const getStatusIcon = () => {
    if (!entry.uploadStatus || entry.type === "directory") return null;

    switch (entry.uploadStatus) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded cursor-pointer" style={{ paddingLeft: `${level * 16}px` }} onClick={() => hasChildren && setIsOpen(!isOpen)}>
        {hasChildren ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="w-4" />}

        {entry.type === "directory" ? <Folder className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}

        <span className="flex-1">{entry.name}</span>
        {getStatusIcon()}
        {entry.error && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>

      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode key={child.path} entry={child} level={level + 1} onUpload={onUpload} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StorageUploadPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState<string>("");

  const getFilesRecursively = async (dirHandle: FileSystemDirectoryHandle, path = ""): Promise<FileEntry[]> => {
    const entries: FileEntry[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        const newPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === "file") {
          const fileHandle = await dirHandle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();

          entries.push({
            name: entry.name,
            path: newPath,
            type: "file",
            file: file,
            relativePath: newPath,
            uploadStatus: "pending",
          });
        } else if (entry.kind === "directory") {
          try {
            const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
            const subEntries = await getFilesRecursively(subDirHandle, newPath);

            entries.push({
              name: entry.name,
              path: newPath,
              type: "directory",
              children: subEntries,
            });
          } catch (err) {
            entries.push({
              name: entry.name,
              path: newPath,
              type: "directory",
              error: "Access denied",
            });
          }
        }
      }
    } catch (err) {
      console.error("Error reading directory:", err);
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const flattenFileEntries = (entries: FileEntry[]): FileEntry[] => {
    const files: FileEntry[] = [];

    const traverse = (entry: FileEntry) => {
      if (entry.type === "file") {
        files.push(entry);
      }
      if (entry.children) {
        entry.children.forEach(traverse);
      }
    };

    entries.forEach(traverse);
    return files;
  };

  const uploadAllFiles = async () => {
    const allFiles = flattenFileEntries(entries);
    if (allFiles.length === 0) return;

    const formData = new FormData();
    formData.append("basePath", basePath);

    try {
      allFiles.forEach((entry) => {
        if (entry.file && entry.relativePath) {
          updateEntryStatus(entry.path, "pending");
          formData.append("files", entry.file);
          formData.append("paths", entry.relativePath);
        }
      });

      const response = await fetch("/api/storage/upload-directory", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        allFiles.forEach((entry) => {
          updateEntryStatus(entry.path, "success");
        });
      } else {
        throw new Error(data.error || "업로드 실패");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
      allFiles.forEach((entry) => {
        updateEntryStatus(entry.path, "error");
      });
    }
  };

  const handleSelectDirectory = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        throw new Error("File System Access API is not supported in this browser");
      }

      const dirHandle = await window.showDirectoryPicker();
      const newBasePath = dirHandle.name;
      setBasePath(newBasePath);

      const fileEntries = await getFilesRecursively(dirHandle);
      setEntries(fileEntries);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  const updateEntryStatus = (path: string, status: FileEntry["uploadStatus"]) => {
    setEntries((prevEntries) => {
      const updateEntry = (entries: FileEntry[]): FileEntry[] => {
        return entries.map((entry) => {
          if (entry.path === path) {
            return { ...entry, uploadStatus: status };
          }
          if (entry.children) {
            return { ...entry, children: updateEntry(entry.children) };
          }
          return entry;
        });
      };
      return updateEntry(prevEntries);
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>파일 업로드</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleSelectDirectory}>폴더 선택</Button>
            {entries.length > 0 && (
              <Button onClick={uploadAllFiles} variant="secondary">
                모든 파일 업로드
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {entries.length > 0 && (
            <div className="border rounded-lg p-4 bg-background">
              {entries.map((entry) => (
                <TreeNode key={entry.path} entry={entry} level={0} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
