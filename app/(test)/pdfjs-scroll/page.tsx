"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";

interface RenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

interface PageData {
  pageNumber: number;
  page: PDFPageProxy;
  isRendering: boolean;
}

export default function PdfScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.5);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const mountedRef = useRef(true);
  const pdfLibRef = useRef<typeof import("pdfjs-dist")>();

  // PDF.js 초기화
  useEffect(() => {
    const initPdfLib = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        pdfLibRef.current = pdfjs;
      } catch (error) {
        console.error("PDF.js 초기화 중 에러 발생:", error);
      }
    };

    initPdfLib();
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 특정 페이지의 렌더링 작업 취소
  const cancelRenderTask = useCallback((pageNum: number) => {
    const task = renderTasksRef.current.get(pageNum);
    if (task) {
      task.cancel();
      renderTasksRef.current.delete(pageNum);

      // 페이지 상태 업데이트
      setPages((prevPages) => prevPages.map((p) => (p.pageNumber === pageNum ? { ...p, isRendering: false } : p)));
    }
  }, []);

  // 모든 렌더링 작업 취소
  const cancelAllRenderTasks = useCallback(() => {
    for (const [pageNum] of renderTasksRef.current) {
      cancelRenderTask(pageNum);
    }
  }, [cancelRenderTask]);

  // 페이지 렌더링 함수
  const renderPage = useCallback(
    async (pageData: PageData, canvas: HTMLCanvasElement, pageScale: number) => {
      const pageNum = pageData.pageNumber;

      if (pageData.isRendering || !mountedRef.current) {
        return;
      }

      try {
        // 이전 렌더링 작업 취소
        cancelRenderTask(pageNum);

        // 페이지 렌더링 상태 업데이트
        setPages((prevPages) => prevPages.map((p) => (p.pageNumber === pageNum ? { ...p, isRendering: true } : p)));

        const viewport = pageData.page.getViewport({ scale: pageScale });
        const context = canvas.getContext("2d");
        if (!context || !mountedRef.current) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = pageData.page.render({
          canvasContext: context,
          viewport,
        });

        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;

        if (mountedRef.current) {
          renderTasksRef.current.delete(pageNum);
          setRenderedPages((prev) => new Set(prev).add(pageNum));
          setPages((prevPages) => prevPages.map((p) => (p.pageNumber === pageNum ? { ...p, isRendering: false } : p)));
        }
      } catch (error: unknown) {
        if (!mountedRef.current) return;

        if ((error as Error)?.message !== "Rendering cancelled") {
          console.error(`페이지 ${pageNum} 렌더링 중 에러 발생:`, error);
        }

        setPages((prevPages) => prevPages.map((p) => (p.pageNumber === pageNum ? { ...p, isRendering: false } : p)));
      }
    },
    [cancelRenderTask],
  );

  // PDF 문서 로드
  useEffect(() => {
    const loadPDF = async () => {
      if (!mountedRef.current || !pdfLibRef.current) return;

      try {
        const loadingTask = pdfLibRef.current.getDocument("/pdf-example/test-big.pdf");
        const pdfDocument = await loadingTask.promise;

        if (!mountedRef.current) {
          pdfDocument.destroy();
          return;
        }

        setPdfDoc(pdfDocument);

        const pagePromises = Array.from({ length: pdfDocument.numPages }, async (_, i) => {
          const pageNum = i + 1;
          const page = await pdfDocument.getPage(pageNum);
          return {
            pageNumber: pageNum,
            page,
            isRendering: false,
          };
        });

        const loadedPages = await Promise.all(pagePromises);

        if (mountedRef.current) {
          setPages(loadedPages);
          setLoading(false);
        } else {
          // 컴포넌트가 언마운트된 경우 페이지 정리
          for (const { page } of loadedPages) {
            page.cleanup();
          }
        }
      } catch (error) {
        if (mountedRef.current) {
          console.error("PDF 로드 중 에러 발생:", error);
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      cancelAllRenderTasks();
      for (const { page } of pages) {
        page.cleanup();
      }
      if (pdfDoc) {
        pdfDoc.destroy();
      }
      pageCanvasesRef.current.clear();
      renderTasksRef.current.clear();
    };
  }, [cancelAllRenderTasks, pdfLibRef.current]);

  // Intersection Observer로 페이지 렌더링 관찰
  useEffect(() => {
    if (!containerRef.current || pages.length === 0 || !mountedRef.current) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!mountedRef.current) return;

        for (const entry of entries) {
          const pageNum = Number(entry.target.getAttribute("data-page"));
          const canvas = entry.target.querySelector("canvas");
          const pageData = pages.find((p) => p.pageNumber === pageNum);

          if (!entry.isIntersecting) {
            cancelRenderTask(pageNum);
            continue;
          }

          if (canvas instanceof HTMLCanvasElement && pageData && !renderedPages.has(pageNum)) {
            pageCanvasesRef.current.set(pageNum, canvas);
            renderPage(pageData, canvas, scale);
          }
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    for (const el of containerRef.current.querySelectorAll(".page-container")) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pages, scale, renderPage, cancelRenderTask, renderedPages]);

  // 확대/축소 처리 함수
  const handleZoom = useCallback(
    (newScale: number) => {
      if (!mountedRef.current) return;

      const boundedScale = Math.max(Math.min(newScale, 5), 0.6);
      cancelAllRenderTasks();
      setScale(boundedScale);
      setRenderedPages(new Set());

      for (const [pageNum, canvas] of pageCanvasesRef.current.entries()) {
        const pageData = pages.find((p) => p.pageNumber === pageNum);
        if (pageData) {
          renderPage(pageData, canvas, boundedScale);
        }
      }
    },
    [pages, renderPage, cancelAllRenderTasks],
  );

  // 브라우저 확대/축소 이벤트 처리
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleChange = delta > 0 ? 0.2 : -0.2;
        handleZoom(scale + scaleChange);
      }
    };

    // 터치 디바이스 핀치 줌 처리
    let initialDistance = 0;
    let initialScale = scale;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        initialScale = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const scaleFactor = currentDistance / initialDistance;
        handleZoom(initialScale * scaleFactor);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("touchstart", handleTouchStart, { passive: false });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [scale, handleZoom]);

  const handleZoomIn = () => {
    handleZoom(scale + 0.2);
  };

  const handleZoomOut = () => {
    handleZoom(scale - 0.2);
  };

  if (loading) {
    return <div>PDF 로딩 중...</div>;
  }

  return (
    <div className="pdf-scroll-container">
      <div className="controls fixed top-14 right-4 p-2 rounded shadow-md z-10">
        <Button type="button" onClick={handleZoomOut} className="px-3 py-1">
          축소
        </Button>
        <Button type="button" onClick={handleZoomIn} className="px-3 py-1">
          확대
        </Button>
        <span className="ml-2 text-sm text-gray-600">{Math.round(scale * 100)}%</span>
      </div>
      <div ref={containerRef} className="pages-container flex flex-col items-center gap-4 py-4" style={{ touchAction: "pan-x pan-y" }}>
        {pages.map(({ pageNumber }) => (
          <div key={`page-${pageNumber}`} className="page-container bg-white shadow-md" data-page={pageNumber}>
            <canvas className="max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
