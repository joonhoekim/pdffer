"use client";

import { useState } from "react";
import { MouseMonitor } from "./MouseMonitor";

// Popup 컴포넌트
// 마우스 오버 시 팝업 콘텐츠를 표시하고, 마우스가 영역을 벗어나면 숨기는 컴포넌트
// MouseMonitor와 함께 작동하여 정교한 마우스 인터랙션을 구현

interface Props {
  // 마우스 오버 시 호출될 콜백 함수
  // JSX.Element: React 요소를 나타내는 타입
  onMouseOver: (content: JSX.Element) => void;
  // 팝업에 표시될 실제 콘텐츠
  popupContent: JSX.Element;
  // 마우스가 영역을 벗어날 때 호출될 콜백 함수
  onMouseOut: () => void;
  // 팝업을 트리거할 자식 컴포넌트
  children: JSX.Element;
}

export function Popup({ onMouseOver, popupContent, onMouseOut, children }: Props) {
  // mouseIn 상태 관리
  // mouseIn: 마우스가 컴포넌트 영역 내부에 있는지 추적
  // useState<boolean>(false): 초기값을 false로 설정
  const [mouseIn, setMouseIn] = useState(false);

  return (
    // 최상위 div 컨테이너
    // onMouseOver, onMouseOut 이벤트 핸들러 설정
    <div
      onMouseOver={() => {
        // 마우스가 영역에 들어오면 mouseIn을 true로 설정
        setMouseIn(true);
        // MouseMonitor 컴포넌트를 포함한 팝업 콘텐츠를 표시
        onMouseOver(
          <MouseMonitor
            // 마우스가 영역을 벗어났을 때의 동작
            onMoveAway={() => {
              // mouseIn이 true면 팝업을 유지
              // 이는 마우스가 팝업 콘텐츠 위에 있을 때 팝업이 닫히는 것을 방지
              if (mouseIn) {
                return;
              }
              // mouseIn이 false면 팝업을 닫음
              onMouseOut();
            }}
            // 마우스 감지 영역의 패딩 설정 (픽셀 단위)
            paddingX={60} // 수평 패딩
            paddingY={30} // 수직 패딩
          >
            {popupContent}
          </MouseMonitor>,
        );
      }}
      onMouseOut={() => {
        // 마우스가 영역을 벗어나면 mouseIn을 false로 설정
        setMouseIn(false);
      }}>
      {/* 자식 컴포넌트 렌더링 */}
      {children}
    </div>
  );
}
