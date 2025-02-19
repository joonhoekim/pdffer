"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, File, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 인터페이스 정의
interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileEntry[];
  error?: string;
}

interface TreeNodeProps {
  entry: FileEntry;
  level: number;
}

// 트리 노드 컴포넌트
function TreeNode({ entry, level }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = entry.children && entry.children.length > 0;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded cursor-pointer" style={{ paddingLeft: `${level * 16}px` }} onClick={() => hasChildren && setIsOpen(!isOpen)}>
        {hasChildren ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="w-4" />}

        {entry.type === "directory" ? <Folder className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}

        <span>{entry.name}</span>

        {entry.error && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>

      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode key={child.id} entry={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileSystemExplorerDB() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getFilesRecursively = async (dirHandle: FileSystemDirectoryHandle, path = ""): Promise<File[]> => {
    const files: File[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        const newPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === "file") {
          const file = await entry.getFile();
          files.push(file);
        } else if (entry.kind === "directory") {
          try {
            const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
            const subFiles = await getFilesRecursively(subDirHandle, newPath);
            files.push(...subFiles);
          } catch (error) {
            console.warn(`Access denied to directory: ${newPath}`);
          }
        }
      }
    } catch (error) {
      console.error("Error reading directory:", error);
    }

    return files;
  };

  // 디렉토리 선택 핸들러
  const handleSelectDirectory = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        throw new Error("File System Access API is not supported in this browser");
      }

      const dirHandle = await window.showDirectoryPicker();
      const files = await getFilesRecursively(dirHandle);

      // FormData 생성 및 파일 추가
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      // API 호출
      const response = await fetch("/api/storage-db/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // 업로드된 파일 목록 표시
        setEntries(
          data.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            path: file.path,
            type: file.type,
          })),
        );
        setError(null);
      } else {
        throw new Error(data.error || "업로드 실패");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Directory Explorer (with DB)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleSelectDirectory}>Select Directory</Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {entries.length > 0 && (
            <div className="border rounded-lg p-4 bg-background">
              {entries.map((entry) => (
                <TreeNode key={entry.id} entry={entry} level={0} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
