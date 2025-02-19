"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, File, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 인터페이스 정의
interface FileEntry {
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

// 개별 트리 노드 정의 (보통 컴포넌트로 뺴는 부분)
function TreeNode({ entry, level }: TreeNodeProps) {
  // 열림 상태 관리
  const [isOpen, setIsOpen] = useState(false);
  // 자식 노드 유무 확인
  const hasChildren = entry.children && entry.children.length > 0;

  return (
    <div className="text-sm">
      {/* div 태그에 onClick 이벤트 리스너 달려 있음. 자식 있는 경우, 클릭시 열림/닫힘 상태 변경 */}
      <div className="flex items-center gap-1 hover:bg-gray-100 p-1 rounded cursor-pointer" style={{ paddingLeft: `${level * 16}px` }} onClick={() => hasChildren && setIsOpen(!isOpen)}>
        {hasChildren ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="w-4" />}

        {/* 항목이 폴더냐 파일이냐에 따라 다르게 표현 (lucid-react 아이콘으로 표현) */}
        {entry.type === "directory" ? <Folder className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}

        {/* 항목 이름 표시 */}
        <span>{entry.name}</span>

        {/* 에러 발생시 에러 아이콘 표시. 참고로 에러의 대부분은 FileSystemAPI를 브라우저가 지원하지 않기 때문일 것임 */}
        {entry.error && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>

      {/* 자식 노드 유무 확인. 있는 경우, 재귀적으로 자식 노드 표시 */}
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode key={child.path} entry={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileSystemExplorer() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getFilesRecursively = async (dirHandle: FileSystemDirectoryHandle, path = ""): Promise<FileEntry[]> => {
    const entries: FileEntry[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        const newPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === "file") {
          entries.push({
            name: entry.name,
            path: newPath,
            type: "file",
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
          } catch (error) {
            console.warn(`Access denied to directory: ${newPath}`);
            entries.push({
              name: entry.name,
              path: newPath,
              type: "directory",
              error: "Access denied",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error reading directory:", error);
    }

    return entries.sort((a, b) => {
      // 디렉토리를 먼저 표시
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      // 같은 타입끼리는 알파벳 순
      return a.name.localeCompare(b.name);
    });
  };

  // 디렉토리 선택 핸들러
  const handleSelectDirectory = async () => {
    try {
      // 브라우저가 FileSystemAPI를 지원하는지 확인 (크롬, 엣지, 오페라는 지원하는데, 파이어폭스와 사파리는 지원 안함. 브레이브는 flag 수동설정해줘야 함)
      if (!("showDirectoryPicker" in window)) {
        throw new Error("File System Access API is not supported in this browser");
      }

      // 디렉토리 선택 팝업 표시
      const dirHandle = await window.showDirectoryPicker();
      // 디렉토리 내 파일 및 폴더 재귀적으로 조회
      const fileEntries = await getFilesRecursively(dirHandle);
      // 조회된 파일 및 폴더 정보를 상태에 저장
      setEntries(fileEntries);
      // 에러 정보 초기화
      setError(null);
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
        <CardTitle>Directory Explorer</CardTitle>
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
                <TreeNode key={entry.path} entry={entry} level={0} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
