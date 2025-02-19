"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { File, Check, X, Loader2 } from 'lucide-react';

interface FileEntry {
  name: string;
  path: string;
  file: File;
  uploadStatus?: 'pending' | 'success' | 'error';
}

function FileNode({ entry }: { entry: FileEntry }) {
  const getStatusIcon = () => {
    if (!entry.uploadStatus) return null;
    
    switch (entry.uploadStatus) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
    }
  };
  
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded">
        <File className="h-4 w-4 text-gray-500" />
        <span className="flex-1">{entry.name}</span>
        <span className="text-xs text-gray-500">
          {(entry.file.size / 1024).toFixed(1)}KB
        </span>
        {getStatusIcon()}
      </div>
    </div>
  );
}

export default function StorageUploadPage() {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const entries: FileEntry[] = Array.from(e.target.files).map(file => ({
        name: file.name,
        path: file.name,
        file: file
      }));
      setFileEntries(entries);
      setError(null);
      setStatus('');
    }
  };

  const updateFileStatus = (fileName: string, status: FileEntry['uploadStatus']) => {
    setFileEntries(prev => 
      prev.map(entry => 
        entry.name === fileName 
          ? { ...entry, uploadStatus: status }
          : entry
      )
    );
  };

  const handleUpload = async () => {
    if (fileEntries.length === 0) return;

    const formData = new FormData();
    
    try {
      setStatus('업로드 중...');
      
      for (const entry of fileEntries) {
        updateFileStatus(entry.name, 'pending');
        formData.append('files', entry.file);
      }

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        fileEntries.forEach(entry => {
          updateFileStatus(entry.name, 'success');
        });
        setStatus(`업로드 완료: ${data.directory} 폴더에 저장됨`);
      } else {
        throw new Error(data.error || '업로드 실패');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '업로드 실패');
      fileEntries.forEach(entry => {
        updateFileStatus(entry.name, 'error');
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>파일 업로드</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input 
            type="file" 
            multiple 
            onChange={handleFileChange}
            className="block w-full
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold"
          />
          
          {fileEntries.length > 0 && (
            <div className="border rounded-lg p-4 bg-background">
              {fileEntries.map((entry) => (
                <FileNode key={entry.path} entry={entry} />
              ))}
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={fileEntries.length === 0}
            className="w-full"
          >
            {fileEntries.length > 0 
              ? `${fileEntries.length}개 파일 업로드` 
              : '파일을 선택하세요'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status && !error && (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 