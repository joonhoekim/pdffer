"use client";

// import { PdfLoader } from "@/components/pdfjs/pdf-viewer/PdfViewer";

import dynamic from "next/dynamic";

const PdfHighlight = dynamic(() => import("@/pdf-highlight/PdfHighlight"), {
  ssr: false,
  loading: () => <div className="flex justify-items-center items-center h-dvh">PDF 로딩 중...</div>,
});

export default function PdfjsRefactor() {
  // const url = "https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4731_sample_explain.pdf";

  return (
    <>
      <PdfHighlight />
    </>
  );
}
