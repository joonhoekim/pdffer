"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export function PdfUploader({ onFileUploaded }) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // null, 'uploading', 'success', 'error'

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];

      if (file && file.type === "application/pdf") {
        // 업로드 시작
        setUploadStatus("uploading");

        // 실제 구현에서는 여기서 API 호출 또는 파일 처리 로직
        // 예시를 위한 모의 업로드 진행
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          setUploadProgress(progress);

          if (progress >= 100) {
            clearInterval(interval);
            setUploadStatus("success");
            // 성공 시 상위 컴포넌트에 파일 정보 전달
            onFileUploaded({
              id: `pdf-${Date.now()}`,
              name: file.name,
              size: file.size,
              lastModified: file.lastModified,
              url: URL.createObjectURL(file), // 실제 구현에서는 서버 URL
            });
          }
        }, 100);
      }
    },
    [onFileUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const resetUpload = () => {
    setUploadStatus(null);
    setUploadProgress(0);
  };

  return (
    <div className="w-full">
      {uploadStatus === null ? (
        <Card {...getRootProps()} className={`border-dashed cursor-pointer hover:bg-accent/50 transition-colors ${isDragActive ? "border-primary bg-accent/50" : "border-muted-foreground/20"}`}>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium mb-1">{isDragActive ? "Drop PDF here" : "Drag & drop your PDF"}</p>
            <p className="text-xs text-muted-foreground mb-3">Or click to browse files</p>
            <Button variant="outline" size="sm" className="mt-2">
              Upload PDF
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium">Uploading PDF...</p>
                  <p className="text-xs text-muted-foreground">{uploadStatus === "success" ? "Upload complete!" : `${uploadProgress}% complete`}</p>
                </div>
              </div>
              {uploadStatus === "success" ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={resetUpload}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
