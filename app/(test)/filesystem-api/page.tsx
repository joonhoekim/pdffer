'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, File, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileEntry[];
  error?: string;
}

interface TreeNodeProps {
  entry: FileEntry;
  level: number;
}

function TreeNode({ entry, level }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = entry.children && entry.children.length > 0;
  
  return (
    <div className="text-sm">
      <div 
        className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : (
          <span className="w-4" />
        )}
        
        {entry.type === 'directory' ? (
          <Folder className="h-4 w-4 text-blue-500" />
        ) : (
          <File className="h-4 w-4 text-gray-500" />
        )}
        
        <span>{entry.name}</span>
        {entry.error && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>
      
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode 
              key={child.path} 
              entry={child} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileSystemExplorer() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getFilesRecursively = async (
    dirHandle: FileSystemDirectoryHandle, 
    path = ""
  ): Promise<FileEntry[]> => {
    const entries: FileEntry[] = [];
    
    try {
      for await (const entry of dirHandle.values()) {
        const newPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === "file") {
          entries.push({
            name: entry.name,
            path: newPath,
            type: "file"
          });
        }
        else if (entry.kind === "directory") {
          try {
            const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
            const subEntries = await getFilesRecursively(subDirHandle, newPath);
            
            entries.push({
              name: entry.name,
              path: newPath,
              type: "directory",
              children: subEntries
            });
          } catch (error) {
            console.warn(`Access denied to directory: ${newPath}`);
            entries.push({
              name: entry.name,
              path: newPath,
              type: "directory",
              error: "Access denied"
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }
    
    return entries.sort((a, b) => {
      // 디렉토리를 먼저 표시
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      // 같은 타입끼리는 알파벳 순
      return a.name.localeCompare(b.name);
    });
  };

  const handleSelectDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API is not supported in this browser');
      }

      const dirHandle = await window.showDirectoryPicker();
      const fileEntries = await getFilesRecursively(dirHandle);
      setEntries(fileEntries);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Directory Explorer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleSelectDirectory}>
            Select Directory
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {entries.length > 0 && (
            <div className="border rounded-lg p-4 bg-background">
              {entries.map((entry) => (
                <TreeNode 
                  key={entry.path} 
                  entry={entry} 
                  level={0}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}