import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

interface Props {
  workerSrc?: string;
  url: string;
  beforeLoad: React.ReactNode;
  errorMessage?: (error: Error) => React.ReactNode;
  children: (pdfDocument: PDFDocumentProxy) => React.ReactNode;
  onError?: (error: Error) => void;
  cMapUrl?: string;
  cMapPacked?: boolean;
}

// 워커를 넣어줘야 하는데, 제공되는 값이 없으면 CDN에서 받아오도록 기본값 처리함
export function PdfLoader({ workerSrc = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs", url, beforeLoad, errorMessage, children, onError, cMapUrl, cMapPacked }: Props) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const documentRef = useRef<HTMLElement>(null);

  // 에러 처리 핸들러는 버그 수집 등의 목적이 있다면 수정할 것
  const handleError = (error: Error) => {
    onError?.(error);
    setError(error);
    setPdfDocument(null);
  };

  // 훅 내부에서 pdfDocument는 cleanup 용도이므로 의존성 배열에 추가하지 않는게 더 나음.
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const loadPdf = async () => {
      try {
        // 의존성배열 변경시 초기화
        setPdfDocument(null);
        setError(null);
        await pdfDocument?.destroy();

        // url이 없으면 초기화 종료
        if (!url) return;

        // 워커 초기화
        if (typeof workerSrc === "string") {
          GlobalWorkerOptions.workerSrc = workerSrc;
        }

        // 문서 초기화
        const ownerDocument = documentRef.current?.ownerDocument || document;
        const pdfDoc = await getDocument({
          url,
          ownerDocument,
          cMapUrl,
          cMapPacked,
        }).promise;

        // 비동기로 렌더링 시작
        setPdfDocument(pdfDoc);
      } catch (e) {
        handleError(e as Error);
      }
    };

    loadPdf();

    // Cleanup on unmount or URL change
    return () => {
      pdfDocument?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, workerSrc, cMapUrl, cMapPacked]);
  //url, workerSrc, cMapUrl, cMapPacked 변경 시 훅 재실행 (useEffect)

  return (
    <>
      <span ref={documentRef} />
      {error ? (errorMessage ? errorMessage(error) : null) : !pdfDocument || !children ? beforeLoad : children(pdfDocument)}
    </>
  );
}
