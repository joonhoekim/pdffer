"use client";

import { Rnd } from "react-rnd";
import { getPageFromElement } from "../lib/pdfjs-dom";
import styles from "../style/AreaHighlight.module.css";
import type { LTWHP, ViewportHighlight } from "../types";

// AreaHighlight 컴포넌트
// PDF 페이지에서 선택된 영역을 하이라이트하고 조작(이동, 크기 조절)할 수 있게 해주는 컴포넌트
// react-rnd 라이브러리를 사용하여 드래그 & 리사이즈 기능 구현

// 컴포넌트 프롭스 인터페이스
interface Props {
  // 하이라이트 정보 (위치, 크기 등)
  highlight: ViewportHighlight;
  // 하이라이트 영역이 변경될 때 호출되는 콜백
  onChange: (rect: LTWHP) => void;
  // 현재 하이라이트가 스크롤되어 보이는 상태인지 여부
  isScrolledTo: boolean;
}

export function AreaHighlight({ highlight, onChange, isScrolledTo, ...otherProps }: Props) {
  return (
    <div className={`${styles.areaHighlight} ${isScrolledTo ? styles.scrolledTo : ""}`}>
      <Rnd
        className={styles.part}
        onDragStop={(_, data) => {
          // boundingRect: PDF 페이지 내에서 하이라이트 영역의 경계를 나타내는 객체
          // LTWHP 타입은 Left, Top, Width, Height, Page를 포함하는 인터페이스
          const boundingRect: LTWHP = {
            ...highlight.position.boundingRect,
            top: data.y,
            left: data.x,
          };
          onChange(boundingRect);
        }}
        onResizeStop={(_mouseEvent, _direction, ref, _delta, position) => {
          // ref.offsetWidth/Height: 실제 DOM 요소의 크기를 픽셀 단위로 반환
          // position: Rnd 컴포넌트가 제공하는 새로운 위치 정보
          const boundingRect: LTWHP = {
            top: position.y,
            left: position.x,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            // getPageFromElement: DOM 요소가 속한 PDF 페이지 번호를 찾는 유틸리티 함수
            pageNumber: getPageFromElement(ref)?.number || -1,
          };
          onChange(boundingRect);
        }}
        position={{
          x: highlight.position.boundingRect.left,
          y: highlight.position.boundingRect.top,
        }}
        size={{
          width: highlight.position.boundingRect.width,
          height: highlight.position.boundingRect.height,
        }}
        onClick={(event: React.MouseEvent) => {
          // React.MouseEvent: React의 합성 이벤트 시스템이 제공하는 타입
          // 브라우저의 네이티브 MouseEvent를 래핑하여 크로스 브라우저 호환성 제공
          event.stopPropagation(); // 이벤트 버블링 방지
          event.preventDefault(); // 기본 동작 방지
        }}
        {...otherProps}
      />
    </div>
  );
}
