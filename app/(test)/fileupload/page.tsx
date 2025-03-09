"use client";

import { PdfUploader } from "@/components/file/PdfUploader";
import { PdfLibrary } from "@/components/file/FileList";

export default function FileUpload() {
  return (
    <>
      <PdfUploader onFileUploaded={() => {}} />
      <PdfLibrary files={[]} currentFileId={null} onFileSelect={() => {}} onFileUpload={() => {}} />
    </>
  );
}
