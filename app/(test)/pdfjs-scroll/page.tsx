"use client";

import { LoadingSpinner } from "@/components/custom-ui/loading-spinner";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
});

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-red-500 mb-4">PDF 뷰어 로드 중 오류가 발생했습니다:</p>
      <p className="mb-4">{error.message}</p>
      <button type="button" onClick={resetErrorBoundary} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        다시 시도
      </button>
    </div>
  );
}

export default function PdfScroll() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // 에러 상태를 초기화하고 컴포넌트를 다시 마운트합니다
      }}>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center justify-center p-4">
              <p>PDF 뷰어 로딩 중...</p>
              <LoadingSpinner />
            </div>
          </div>
        }>
        <PdfViewer />
      </Suspense>
    </ErrorBoundary>
  );
}
