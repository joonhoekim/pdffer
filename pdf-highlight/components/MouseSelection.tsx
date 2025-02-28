"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isHTMLElement } from "../lib/pdfjs-dom";
import styles from "../style/MouseSelection.module.css";
import type { LTWH } from "../types.js";

// 마우스 좌표를 저장하기 위한 인터페이스
// x: 수평 좌표
// y: 수직 좌표
interface Coords {
  x: number;
  y: number;
}

// 컴포넌트 프롭스 인터페이스
// onSelection: 영역 선택 완료 시 호출되는 콜백
// onDragStart: 드래그 시작 시 호출되는 콜백
// onDragEnd: 드래그 종료 시 호출되는 콜백
// shouldStart: 드래그 시작 가능 여부를 결정하는 함수
// onChange: 선택 상태 변경 시 호출되는 콜백
interface Props {
  onSelection: (startTarget: HTMLElement, boundingRect: LTWH, resetSelection: () => void) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  shouldStart: (event: MouseEvent) => boolean;
  onChange: (isVisible: boolean) => void;
}

// 시작점과 끝점으로부터 선택 영역의 경계 상자를 계산
// 좌상단 좌표와 너비, 높이를 반환
const getBoundingRect = (start: Coords, end: Coords): LTWH => ({
  left: Math.min(end.x, start.x),
  top: Math.min(end.y, start.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

// 선택 영역이 충분한 크기를 가지는지 확인
// 너비와 높이가 모두 1픽셀 이상인 경우에만 true 반환
const shouldRender = (boundingRect: LTWH) => boundingRect.width >= 1 && boundingRect.height >= 1;

// MouseSelection 컴포넌트
// PDF 페이지에서 마우스로 영역을 선택하는 기능을 구현
export function MouseSelection({ onSelection, onDragStart, onDragEnd, shouldStart, onChange }: Props) {
  // 상태 관리
  // locked: 선택이 완료되어 잠긴 상태
  // start: 드래그 시작 좌표
  // end: 드래그 종료 좌표
  const [locked, setLocked] = useState(false);
  const [start, setStart] = useState<Coords | null>(null);
  const [end, setEnd] = useState<Coords | null>(null);

  // ref 관리
  // rootRef: 컴포넌트 루트 요소
  // startRef: 드래그 시작 좌표를 이벤트 핸들러에서 참조하기 위한 ref
  // lockedRef: 잠금 상태를 이벤트 핸들러에서 참조하기 위한 ref
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(start);
  const lockedRef = useRef(locked);

  // start 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    startRef.current = start;
  }, [start]);

  // locked 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // 선택 상태 초기화 함수
  // 드래그 종료 처리 및 모든 상태를 초기값으로 리셋
  const reset = useCallback(() => {
    onDragEnd();
    setStart(null);
    setEnd(null);
    setLocked(false);
  }, [onDragEnd]);

  // 선택 영역 표시 상태 변경 감지
  // start와 end가 모두 존재할 때 선택 영역이 표시됨
  useEffect(() => {
    const isVisible = Boolean(start && end);
    onChange(isVisible);
  }, [start, end, onChange]);

  // 마우스 이벤트 핸들러 설정
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const container = root.parentElement;
    if (!container || !isHTMLElement(container)) {
      return;
    }

    // 컨테이너 기준 좌표 계산
    // 페이지 스크롤과 컨테이너 위치를 고려하여 실제 좌표 반환
    const containerCoords = (pageX: number, pageY: number) => {
      const containerBoundingRect = container.getBoundingClientRect();
      return {
        x: pageX - containerBoundingRect.left + container.scrollLeft,
        y: pageY - containerBoundingRect.top + container.scrollTop - window.scrollY,
      };
    };

    // 마우스 이동 핸들러
    // 드래그 중일 때 end 좌표 업데이트
    const mouseMoveHandler = (event: MouseEvent) => {
      if (!startRef.current || lockedRef.current) {
        return;
      }
      setEnd(containerCoords(event.pageX, event.pageY));
    };

    // 마우스 다운 핸들러
    // 드래그 시작 처리 및 마우스 업 이벤트 리스너 등록
    const mouseDownHandler = (event: MouseEvent) => {
      if (!shouldStart(event)) {
        reset();
        return;
      }

      const startTarget = event.target as HTMLElement;
      if (!(startTarget instanceof Element) || !isHTMLElement(startTarget)) {
        return;
      }

      onDragStart();
      setStart(containerCoords(event.pageX, event.pageY));
      setEnd(null);
      setLocked(false);

      // 마우스 업 핸들러
      // 드래그 종료 처리 및 선택 영역 확정
      const mouseUpHandler = (event: Event) => {
        event.currentTarget?.removeEventListener("mouseup", mouseUpHandler);
        const currentStart = startRef.current;
        if (!currentStart) {
          return;
        }
        if (!(event instanceof MouseEvent)) {
          return;
        }

        const endCoords = containerCoords(event.pageX, event.pageY);
        const boundingRect = getBoundingRect(currentStart, endCoords);

        if (!(event.target instanceof Element) || !isHTMLElement(event.target) || !container.contains(event.target) || !shouldRender(boundingRect)) {
          reset();
          return;
        }

        setEnd(endCoords);
        setLocked(true);

        onSelection(startTarget, boundingRect, reset);
        onDragEnd();
      };

      const doc = container.ownerDocument;
      if (doc?.body) {
        doc.body.addEventListener("mouseup", mouseUpHandler);
      }
    };

    // 이벤트 리스너 등록
    container.addEventListener("mousemove", mouseMoveHandler);
    container.addEventListener("mousedown", mouseDownHandler);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      container.removeEventListener("mousemove", mouseMoveHandler);
      container.removeEventListener("mousedown", mouseDownHandler);
    };
  }, [shouldStart, onDragStart, onDragEnd, onSelection, reset]);

  // 선택 영역 렌더링
  // start와 end 좌표가 모두 있을 때만 선택 영역 표시
  return <div ref={rootRef}>{start && end && <div className={styles.mouseSelection} style={getBoundingRect(start, end)} />}</div>;
}
