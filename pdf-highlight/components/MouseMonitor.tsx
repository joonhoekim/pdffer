"use client";

import React, { Component } from "react";

// MouseMonitor 컴포넌트
// 마우스 움직임을 모니터링하여 특정 영역을 벗어났을 때 콜백을 실행하는 컴포넌트
// 주로 팝업이나 툴팁의 자동 숨김 기능을 구현할 때 사용

// 컴포넌트 프롭스 인터페이스
interface Props {
  // 마우스가 지정된 영역을 벗어났을 때 호출될 콜백 함수
  onMoveAway: () => void;
  // 감지 영역의 수평 패딩 (픽셀)
  paddingX: number;
  // 감지 영역의 수직 패딩 (픽셀)
  paddingY: number;
  // 감시할 자식 컴포넌트
  // React.ReactElement 타입이지만 JSX.Element로도 표현 가능
  children: React.ReactElement;
}

// MouseMonitor 클래스 컴포넌트
// React.Component를 상속받아 구현
export class MouseMonitor extends Component<Props> {
  // 컴포넌트의 DOM 요소를 참조하기 위한 변수
  // HTMLDivElement: 브라우저 내장 인터페이스로, <div> 요소를 나타냄
  container: HTMLDivElement | null = null;

  // 이벤트 리스너 정리를 위한 함수
  // 컴포넌트 언마운트 시 메모리 누수 방지를 위해 사용
  unsubscribe = () => {};

  // 마우스 이동 이벤트 핸들러
  // MouseEvent: 브라우저의 마우스 이벤트 인터페이스
  onMouseMove = (event: MouseEvent) => {
    if (!this.container) {
      return;
    }

    const { onMoveAway, paddingX, paddingY } = this.props;

    // clientX, clientY: 뷰포트(브라우저 창) 내에서의 마우스 좌표
    const { clientX, clientY } = event;

    // TODO: see if possible to optimize
    // getBoundingClientRect(): DOM API 메서드
    // 요소의 크기와 뷰포트 상대적 위치 정보를 반환
    // DOMRect 객체를 반환: left, top, right, bottom, width, height 등의 속성 포함
    const { left, top, width, height } = this.container.getBoundingClientRect();

    // 마우스가 지정된 영역(패딩 포함) 내에 있는지 확인
    const inBoundsX = clientX > left - paddingX && clientX < left + width + paddingX;
    const inBoundsY = clientY > top - paddingY && clientY < top + height + paddingY;

    const isNear = inBoundsX && inBoundsY;

    // 영역을 벗어났을 경우 콜백 실행
    if (!isNear) {
      onMoveAway();
    }
  };

  // ref 콜백 함수
  // React의 ref 시스템을 사용하여 DOM 요소에 접근
  attachRef = (ref: HTMLDivElement | null) => {
    this.container = ref;
    this.unsubscribe();

    if (ref) {
      // ownerDocument: DOM 노드의 최상위 document 객체를 참조
      const { ownerDocument: doc } = ref;
      // 문서 전체에 대한 마우스 이벤트 리스너 등록
      doc.addEventListener("mousemove", this.onMouseMove);
      // 클린업 함수 설정
      this.unsubscribe = () => {
        doc.removeEventListener("mousemove", this.onMouseMove);
      };
    }
  };

  // 컴포넌트 렌더링 메서드
  render() {
    // eslint 규칙을 무시하고 props 구조 분해 할당
    // eslint-disable-next-line
    const { onMoveAway, paddingX, paddingY, children, ...restProps } = this.props;

    // React.cloneElement: React API로 기존 엘리먼트를 복제하고 새로운 props를 추가
    // 여기서는 나머지 props를 자식 컴포넌트에 전달
    return <div ref={this.attachRef}>{React.cloneElement(children, restProps)}</div>;
  }
}
