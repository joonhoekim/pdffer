"use client";

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import React, { useEffect, useRef, useState, useCallback } from "react";

// 컴포넌트 프롭스 인터페이스
interface Props {
  /** PDF.js 워커 스크립트의 URL */
  workerSrc: string;

  /** 로드할 PDF 문서의 URL */
  url: string;
  /** PDF 로딩 중 표시할 컴포넌트 */
  beforeLoad: JSX.Element;
  /** 에러 발생 시 표시할 컴포넌트 */
  errorMessage?: JSX.Element;
  /** PDF 문서 로드 완료 후 렌더링할 컴포넌트를 반환하는 함수 */
  children: (pdfDocument: PDFDocumentProxy) => JSX.Element;
  /** 에러 발생 시 호출될 콜백 함수 */
  onError?: (error: Error) => void;
  /** CMap 파일의 URL (비라틴 문자 지원에 필요) */
  cMapUrl?: string;
  /** CMap 파일이 패키지로 제공되는지 여부 */
  cMapPacked?: boolean;
}

export function PdfLoader({ workerSrc = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs", url, beforeLoad, errorMessage, children, onError, cMapUrl, cMapPacked }: Props) {
  // 상태 관리
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // refs
  const documentRef = useRef<HTMLElement>(null);
  const mountedRef = useRef(true);

  // 에러 처리 함수
  const handleError = useCallback(
    (error: Error) => {
      if (!mountedRef.current) return;

      if (onError) {
        onError(error);
      }
      setPdfDocument(null);
      setError(error);
    },
    [onError],
  );

  // PDF 로드 함수
  // pdfDocument 는 변경될 수 있음. 의존성 배열에서 반드시 제외되어야 함
  const loadPdf = useCallback(async () => {
    if (!mountedRef.current) return;

    // 이전 문서 정리 및 상태 초기화
    setPdfDocument(null);
    setError(null);

    // 워커 설정
    if (typeof workerSrc === "string") {
      GlobalWorkerOptions.workerSrc = workerSrc;
    }

    try {
      // 이전 문서가 있다면 정리
      if (pdfDocument) {
        await pdfDocument.destroy();
      }

      if (!url) return;

      const ownerDocument = documentRef.current?.ownerDocument || document;

      // 새 문서 로드
      const loadingTask = getDocument({
        url,
        ownerDocument,
        cMapUrl,
        cMapPacked,
      });

      const newPdfDocument = await loadingTask.promise;

      if (mountedRef.current) {
        setPdfDocument(newPdfDocument);
      } else {
        // 컴포넌트가 언마운트된 경우 문서 정리
        newPdfDocument.destroy();
      }
    } catch (e) {
      if (mountedRef.current) {
        handleError(e as Error);
      }
    }
  }, [url, cMapUrl, cMapPacked, workerSrc]);

  // 마운트/언마운트 및 url 변경 처리
  useEffect(() => {
    mountedRef.current = true;
    loadPdf();

    return () => {
      mountedRef.current = false;
      // 언마운트 시 PDF 문서 정리
      pdfDocument?.destroy();
    };
  }, [loadPdf]);

  // 에러 메시지 렌더링 함수
  const renderError = useCallback(() => {
    if (errorMessage && error) {
      return React.cloneElement(errorMessage, { error });
    }
    return null;
  }, [error, errorMessage]);

  return (
    <>
      <span ref={documentRef} />
      {error ? renderError() : !pdfDocument || !children ? beforeLoad : children(pdfDocument)}
    </>
  );
}
