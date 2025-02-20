"use client";

import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

export default function PdfTestbed() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  // 렌더링 작업 취소 함수
  const cancelRenderTask = () => {
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
  };

  useEffect(() => {
    const loadPDF = async () => {
      try {
        // PDF.js 워커 설정
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        // PDF 로드
        const loadingTask = pdfjsLib.getDocument("/pdf-example/test.pdf");
        const pdfDocument = await loadingTask.promise;
        setPdfDoc(pdfDocument);
        setNumPages(pdfDocument.numPages);
        setLoading(false);
      } catch (error) {
        console.error("PDF 로드 중 에러 발생:", error);
        setLoading(false);
      }
    };

    loadPDF();

    return () => {
      cancelRenderTask();
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        // 이전 렌더링 작업 취소
        cancelRenderTask();

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        // 렌더링 작업 참조 저장
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (error) {
        if (error?.message !== "Rendering cancelled") {
          console.error("페이지 렌더링 중 에러 발생:", error);
        }
      }
    };

    renderPage();
  }, [currentPage, pdfDoc, scale]);

  const handlePrevPage = () => {
    cancelRenderTask();
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    cancelRenderTask();
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    cancelRenderTask();
    setScale((prev) => prev + 0.2);
  };

  const handleZoomOut = () => {
    cancelRenderTask();
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  if (loading) {
    return <div>PDF 로딩 중...</div>;
  }

  return (
    <div className="pdf-container absolute top-0 left-0 w-full h-full">
      <div className="controls" style={{ marginBottom: "1rem" }}>
        <button type="button" onClick={handlePrevPage} disabled={currentPage <= 1}>
          이전 페이지
        </button>
        <span style={{ margin: "0 1rem" }}>
          {currentPage} / {numPages}
        </span>
        <button type="button" onClick={handleNextPage} disabled={currentPage >= numPages}>
          다음 페이지
        </button>
        <button type="button" onClick={handleZoomOut} style={{ marginLeft: "1rem" }}>
          축소
        </button>
        <button type="button" onClick={handleZoomIn} style={{ marginLeft: "0.5rem" }}>
          확대
        </button>
        <span className="ml-2 text-sm text-gray-600">{Math.round(scale * 100)}%</span>
      </div>
      <canvas ref={canvasRef} style={{ border: "1px solid #ddd" }} />
    </div>
  );
}
