"use client";

import { GlobalWorkerOptions, getDocument, version } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import React, { useEffect, useRef, useState, useCallback } from "react";

// 컴포넌트 프롭스 인터페이스
interface Props {
  /** PDF.js 워커 스크립트의 URL */
  workerSrc?: string;

  /** 로드할 PDF 문서의 URL */
  url: string;
  /** PDF 로딩 중 표시할 컴포넌트 */
  beforeLoad: React.ReactElement;
  /** 에러 발생 시 표시할 컴포넌트로, 에러 메세지를 프롭스로 전달 가능함 */
  errorMessage?: React.ReactElement<{ error: Error }>;
  /** PDF 문서 로드 완료 후 렌더링할 컴포넌트를 반환하는 함수 */
  children: (pdfDocument: PDFDocumentProxy) => React.ReactElement;
  /** 에러 발생 시 호출될 콜백 함수 */
  onError?: (error: Error) => void;
  /** CMap 파일의 URL (비라틴 문자 지원에 필요) */
  cMapUrl?: string;
  /** CMap 파일이 패키지로 제공되는지 여부 */
  cMapPacked?: boolean;
}

export function PdfLoader({ workerSrc, url, beforeLoad, errorMessage, children, onError, cMapUrl, cMapPacked }: Props) {
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
  // 따라서 의존성 배열에서 해당 변수들은 반드시 제외되어야 함. 따라서 린트 에러를 서프레스함.
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const loadPdf = useCallback(async () => {
    if (!mountedRef.current) return;

    // 이전 문서 정리 및 상태 초기화
    setPdfDocument(null);
    setError(null);

    // 워커는 별도로 클라이언트가 받아야 하는데(약 500kB), CDN에서 받도록 처리함. 버전을 동적으로 가져오도록 설정함.
    const pdfjsWorkerSrc = workerSrc || `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, cMapUrl, cMapPacked, workerSrc]);

  // 마운트/언마운트 및 url 변경 처리
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    mountedRef.current = true;
    loadPdf();

    return () => {
      mountedRef.current = false;
      // 언마운트 시 PDF 문서 정리
      pdfDocument?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
