"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const PdfHighlighterWrapper = dynamic(() => import("./PdfHighlighter"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<div>PDF 하이라이터 로딩 중...</div>}>
      <PdfHighlighterWrapper />
    </Suspense>
  );
}
