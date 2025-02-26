"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

const PdfHighlight = dynamic(() => import("@/pdf-highlight/PdfHighlight"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
  ssr: false,
});

export default function PdfjsRefactor() {
  // const url = "https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4731_sample_explain.pdf";

  return (
    <Suspense>
      <PdfHighlight />
    </Suspense>
  );
}
