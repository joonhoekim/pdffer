"use client";

import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import { viewportToScaled } from "../lib/coordinates";
import type { IHighlight, LTWH, LTWHP, Position, Scaled, ScaledPosition } from "../types";
import type { T_ViewportHighlight } from "./PdfHighlighter";

// HighlightLayer 컴포넌트
// PDF 페이지의 하이라이트 레이어를 관리하는 컴포넌트
// 각 페이지별로 하이라이트를 렌더링하고 팁(tooltip) 표시를 관리
interface HighlightLayerProps<T_HT> {
  // 페이지 번호별 하이라이트 맵
  // 각 페이지마다 해당 페이지의 하이라이트 배열을 저장
  highlightsByPage: { [pageNumber: string]: Array<T_HT> };
  // 현재 페이지 번호
  pageNumber: string;
  // 현재 스크롤된 하이라이트의 ID
  scrolledToHighlightId: string;
  // 하이라이트 변환 함수
  // 하이라이트 객체를 실제 UI 컴포넌트로 변환
  highlightTransform: (
    highlight: T_ViewportHighlight<T_HT>, // 뷰포트 좌표계의 하이라이트
    index: number, // 하이라이트 인덱스
    setTip: (highlight: T_ViewportHighlight<T_HT>, callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element) => void, // 팁 설정 함수
    hideTip: () => void, // 팁 숨김 함수
    viewportToScaled: (rect: LTWHP) => Scaled, // 좌표계 변환 함수
    screenshot: (position: LTWH) => string, // 스크린샷 생성 함수
    isScrolledTo: boolean, // 스크롤 상태
  ) => JSX.Element;
  // 현재 표시 중인 팁 정보
  tip: {
    highlight: T_ViewportHighlight<T_HT>; // 팁이 표시될 하이라이트
    callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element; // 팁 컨텐츠 생성 함수
  } | null;
  // 좌표계 변환 함수들
  scaledPositionToViewport: (scaledPosition: ScaledPosition) => Position;
  // UI 상태 관리 함수들
  hideTipAndSelection: () => void;
  // PDF 뷰어 인스턴스
  viewer: PDFViewer;
  // 스크린샷 관련 함수
  screenshot: (position: LTWH, pageNumber: number) => string;
  // 팁 표시/설정 함수들
  showTip: (highlight: T_ViewportHighlight<T_HT>, content: JSX.Element) => void;
  setTip: (state: {
    highlight: T_ViewportHighlight<T_HT>;
    callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element;
  }) => void;
}

// HighlightLayer 컴포넌트 구현
// 제네릭을 사용하여 다양한 하이라이트 타입을 지원하면서 IHighlight 인터페이스를 기본으로 확장
export function HighlightLayer<T_HT extends IHighlight>({
  highlightsByPage,
  scaledPositionToViewport,
  pageNumber,
  scrolledToHighlightId,
  highlightTransform,
  tip,
  hideTipAndSelection,
  viewer,
  screenshot,
  showTip,
  setTip,
}: HighlightLayerProps<T_HT>) {
  // 현재 페이지의 하이라이트 목록을 가져옴
  // 페이지 번호를 문자열로 변환하여 접근 (타입 안정성 보장)
  const currentHighlights = highlightsByPage[String(pageNumber)] || [];

  return (
    <div>
      {/* 현재 페이지의 모든 하이라이트를 매핑하여 렌더링 */}
      {currentHighlights.map((highlight, index) => {
        // PDF 좌표계의 하이라이트를 뷰포트 좌표계로 변환
        const viewportHighlight: T_ViewportHighlight<T_HT> = {
          ...highlight,
          position: scaledPositionToViewport(highlight.position),
        };

        // 현재 하이라이트에 대한 팁이 있는 경우 표시
        if (tip && tip.highlight.id === String(highlight.id)) {
          showTip(tip.highlight, tip.callback(viewportHighlight));
        }

        // 현재 하이라이트가 스크롤된 대상인지 확인
        const isScrolledTo = Boolean(scrolledToHighlightId === highlight.id);

        // highlightTransform 함수를 사용하여 하이라이트를 UI 컴포넌트로 변환
        return highlightTransform(
          viewportHighlight,
          index,
          // 팁 설정 콜백
          (highlight, callback) => {
            setTip({ highlight, callback });
            showTip(highlight, callback(highlight));
          },
          hideTipAndSelection,
          // 좌표계 변환 함수
          (rect) => {
            const viewport = viewer.getPageView((rect.pageNumber || Number.parseInt(pageNumber)) - 1).viewport;
            return viewportToScaled(rect, viewport);
          },
          // 스크린샷 생성 함수
          (boundingRect) => screenshot(boundingRect, Number.parseInt(pageNumber)),
          isScrolledTo,
        );
      })}
    </div>
  );
}
