"use client";

import styles from "../style/Highlight.module.css";
import type { LTWHP } from "../types.js";

// Highlight 컴포넌트
// PDF 페이지에서 텍스트 하이라이트를 시각적으로 표시하는 컴포넌트
// 여러 개의 사각형(rects)으로 구성된 하이라이트와 이모지 코멘트를 표시

// 컴포넌트 프롭스 인터페이스
// TypeScript의 인터페이스를 사용하여 컴포넌트의 props 타입을 정의
interface Props {
  // 하이라이트의 위치 정보
  position: {
    // boundingRect: 모든 하이라이트 영역을 포함하는 최소 사각형
    boundingRect: LTWHP;
    // rects: 실제 하이라이트된 텍스트 영역들의 배열
    // 텍스트가 여러 줄에 걸쳐 있을 경우 여러 개의 사각형으로 구성
    rects: Array<LTWHP>;
  };
  // 이벤트 핸들러들
  // React의 이벤트 핸들링 시스템을 활용한 콜백 함수들
  onClick?: () => void; // 클릭 이벤트 핸들러
  onMouseOver?: () => void; // 마우스 오버 이벤트 핸들러
  onMouseOut?: () => void; // 마우스 아웃 이벤트 핸들러
  // 하이라이트에 연결된 코멘트 정보
  comment: {
    emoji: string; // 이모지 문자
    text: string; // 코멘트 텍스트
  };
  // 현재 하이라이트가 스크롤되어 보이는 상태인지 여부
  isScrolledTo: boolean;
}

// Highlight 컴포넌트 구현
// React 함수형 컴포넌트로 구현되며, Props 인터페이스를 타입으로 사용
export function Highlight({ position, onClick, onMouseOver, onMouseOut, comment, isScrolledTo }: Props) {
  // 구조 분해 할당을 사용하여 position 객체에서 필요한 값들을 추출
  const { rects, boundingRect } = position;

  return (
    // CSS 모듈을 사용한 스타일링
    // 템플릿 리터럴을 사용하여 조건부 클래스 적용
    <div className={`Highlight ${styles.highlight} ${isScrolledTo ? styles.scrolledTo : ""}`}>
      {/* 코멘트가 있는 경우에만 이모지 표시 (조건부 렌더링) */}
      {comment ? (
        <div
          className={`Highlight__emoji ${styles.emoji}`}
          style={{
            // 이모지의 위치를 하이라이트 영역 기준으로 설정
            left: 20,
            top: boundingRect.top,
          }}>
          {comment.emoji}
        </div>
      ) : null}
      {/* 하이라이트 영역들을 렌더링하는 컨테이너 */}
      <div className={`Highlight__parts ${styles.parts}`}>
        {/* rects 배열을 매핑하여 각각의 하이라이트 영역을 렌더링 */}
        {/* Array.map을 사용한 리스트 렌더링 */}
        {rects.map((rect, index) => (
          <div
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            onClick={onClick}
            // biome-ignore lint/suspicious/noArrayIndexKey: We can use position hash at some point in future
            // React의 key prop: 리스트 렌더링 시 각 항목을 식별하기 위한 고유값
            // 여기서는 임시로 배열 인덱스를 사용 (이상적이지는 않음)
            key={index}
            // 인라인 스타일을 사용하여 각 하이라이트 영역의 위치와 크기 설정
            // rect 객체는 LTWHP 타입으로, left, top, width, height, pageNumber 속성을 가짐
            style={rect}
            className={`Highlight__part ${styles.part}`}
          />
        ))}
      </div>
    </div>
  );
}
