"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// pdf.js 타입 임포트
import type { PDFDocumentProxy, PDFPageProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import { LoadingSpinner } from "@/components/custom-ui/loading-spinner";

interface RenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

interface PageData {
  pageNumber: number;
  page: PDFPageProxy;
  isRendering: boolean;
  viewport: {
    width: number;
    height: number;
  };
}

export default function PdfViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const mountedRef = useRef(true);
  const pdfLibRef = useRef<typeof import("pdfjs-dist")>(null);

  // PDF.js 초기화
  useEffect(() => {
    mountedRef.current = true;
    console.log("마운트 상태 설정:", mountedRef.current);

    const initPdfLib = async () => {
      console.log("PDF.js 초기화 시작");
      try {
        // PDF.js 동적 임포트
        const pdfjs = await import("pdfjs-dist");
        console.log("PDF.js 모듈 로드 완료");

        if (!mountedRef.current) {
          console.log("초기화 중 컴포넌트 언마운트 감지");
          return;
        }

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        console.log("PDF.js 워커 경로 설정 완료");

        pdfLibRef.current = pdfjs;
        console.log("PDF.js 초기화 완료, 문서 로드 시작");

        // PDF 초기화 후 바로 문서 로드 시작
        await loadPDF();
      } catch (error) {
        console.error("PDF.js 초기화 중 에러 발생:", error);
        if (mountedRef.current) {
          setError("PDF 뷰어를 초기화하는데 실패했습니다.");
          setLoading(false);
        }
      }
    };

    initPdfLib();

    return () => {
      console.log("컴포넌트 언마운트");
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
        cancelRenderTask(pageNum);
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
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.pageNumber === pageNum
                ? {
                    ...p,
                    isRendering: false,
                    viewport: {
                      width: viewport.width,
                      height: viewport.height,
                    },
                  }
                : p,
            ),
          );
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

  // PDF 문서 로드 함수
  const loadPDF = useCallback(async () => {
    console.log("loadPDF 함수 시작");
    if (!mountedRef.current || !pdfLibRef.current) {
      console.log("loadPDF 조기 종료:", { mounted: mountedRef.current, pdfLib: !!pdfLibRef.current });
      return;
    }

    try {
      console.log("PDF 로드 태스크 생성 시작");
      const loadingTask = pdfLibRef.current.getDocument({
        url: "/pdf-example/test-big.pdf",
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        verbosity: 1,
      }) as PDFDocumentLoadingTask;

      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        if (mountedRef.current) {
          const progressPercentage = (progress.loaded / progress.total) * 100;
          setLoadingProgress(progressPercentage);
          console.log(`PDF 로딩 진행률: ${progressPercentage.toFixed(1)}%`);
        }
      };

      console.log("PDF 문서 로드 시작");
      const pdfDocument = await loadingTask.promise;
      console.log("PDF 문서 로드 완료");

      if (!mountedRef.current) {
        console.log("컴포넌트 언마운트로 인한 PDF 문서 정리");
        pdfDocument.destroy();
        return;
      }

      setPdfDoc(pdfDocument);
      console.log(`총 페이지 수: ${pdfDocument.numPages}`);

      const pagePromises = Array.from({ length: pdfDocument.numPages }, async (_, i) => {
        const pageNum = i + 1;
        if (!mountedRef.current) return null;

        console.log(`페이지 ${pageNum} 로드 시작`);
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        console.log(`페이지 ${pageNum} 로드 완료`);
        return {
          pageNumber: pageNum,
          page,
          isRendering: false,
          viewport: {
            width: viewport.width,
            height: viewport.height,
          },
        };
      });

      console.log("모든 페이지 로드 시작");
      const loadedPages = (await Promise.all(pagePromises)).filter((page): page is PageData => page !== null);
      console.log("모든 페이지 로드 완료");

      if (mountedRef.current) {
        setPages(loadedPages);
        setLoading(false);
        setError(null);
        console.log("PDF 뷰어 초기화 완료");
      } else {
        console.log("컴포넌트 언마운트로 인한 페이지 정리");
        for (const { page } of loadedPages) {
          page.cleanup();
        }
      }
    } catch (error) {
      console.error("PDF 로드 중 상세 에러:", error);
      if (mountedRef.current) {
        setError("PDF 파일을 로드하는데 실패했습니다.");
        setLoading(false);
      }
    }
  }, [scale]);

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

      // 모든 페이지의 viewport 크기 업데이트
      setPages((prevPages) =>
        prevPages.map((pageData) => {
          const viewport = pageData.page.getViewport({ scale: boundedScale });
          return {
            ...pageData,
            viewport: {
              width: viewport.width,
              height: viewport.height,
            },
          };
        }),
      );

      setScale(boundedScale);
      setRenderedPages(new Set());

      // 현재 보이는 페이지만 다시 렌더링
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

  if (error) {
    throw new Error(error);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-4">
        <p className="pb-4">PDF 로딩 중...</p>
        <div className="w-[300px]">
          <Progress value={loadingProgress} className="h-2" />
        </div>
        <p className="text-sm text-gray-500">{loadingProgress.toFixed(1)}%</p>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="pdf-scroll-container">
      <div className="controls fixed top-14 right-4 p-2 rounded shadow-md z-10 bg-white">
        <Button type="button" onClick={handleZoomOut} className="px-3 py-1">
          축소
        </Button>
        <Button type="button" onClick={handleZoomIn} className="px-3 py-1">
          확대
        </Button>
        <span className="ml-2 text-sm text-gray-600">{Math.round(scale * 100)}%</span>
      </div>
      <div ref={containerRef} className="pages-container flex flex-col items-center gap-4 py-4" style={{ touchAction: "pan-x pan-y" }}>
        {pages.map(({ pageNumber, viewport }) => (
          <div
            key={`page-${pageNumber}`}
            className="page-container bg-white shadow-md relative"
            data-page={pageNumber}
            style={{
              width: viewport.width,
              height: viewport.height,
            }}>
            <canvas className="max-w-full absolute top-0 left-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
