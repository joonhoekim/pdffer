"use client";

import { Component } from "react";
import styles from "../style/Tip.module.css";

// Tip 컴포넌트
// PDF 하이라이트에 대한 코멘트와 이모지를 추가하는 UI 컴포넌트
// 축소/확장 가능한 형태로 구현되어 있음

// 컴포넌트의 상태 인터페이스
interface State {
  // compact: 축소된 상태인지 여부
  compact: boolean;
  // text: 사용자가 입력한 코멘트 텍스트
  text: string;
  // emoji: 사용자가 선택한 이모지
  emoji: string;
}

// 컴포넌트의 프롭스 인터페이스
interface Props {
  // 코멘트 저장 시 호출될 콜백 함수
  onConfirm: (comment: { text: string; emoji: string }) => void;
  // 팁이 열릴 때 호출될 콜백 함수
  onOpen: () => void;
  // 상태가 업데이트될 때 호출될 선택적 콜백 함수
  onUpdate?: () => void;
}

// React.Component를 상속받는 클래스 컴포넌트
// 제네릭 매개변수로 Props와 State 타입을 지정
export class Tip extends Component<Props, State> {
  // 초기 상태 설정
  state: State = {
    compact: true, // 처음에는 축소된 상태로 시작
    text: "", // 빈 코멘트
    emoji: "", // 선택된 이모지 없음
  };

  // React 생명주기 메서드: 컴포넌트 업데이트 후 호출
  // _: 사용하지 않는 매개변수를 표시하는 TypeScript 컨벤션
  // nextState: 업데이트 이전의 상태
  componentDidUpdate(_: Props, nextState: State) {
    const { onUpdate } = this.props;

    // compact 상태가 변경되고 onUpdate 콜백이 제공된 경우 호출
    if (onUpdate && this.state.compact !== nextState.compact) {
      onUpdate();
    }
  }

  // 컴포넌트 렌더링 메서드
  render() {
    const { onConfirm, onOpen } = this.props;
    const { compact, text, emoji } = this.state;

    return (
      <div>
        {/* 삼항 연산자를 사용한 조건부 렌더링 */}
        {compact ? (
          // 축소된 상태일 때 표시되는 UI
          <div
            className={styles.compact}
            onClick={() => {
              onOpen(); // 열기 콜백 호출
              this.setState({ compact: false }); // 확장 상태로 전환
            }}>
            Add highlight
          </div>
        ) : (
          // 확장된 상태일 때 표시되는 폼
          <form
            className={styles.card}
            onSubmit={(event) => {
              // 기본 폼 제출 동작 방지
              event.preventDefault();
              // 입력된 코멘트와 이모지로 콜백 호출
              onConfirm({ text, emoji });
            }}>
            <div>
              {/* 코멘트 입력을 위한 텍스트 영역 */}
              <textarea
                placeholder="Your comment"
                // biome-ignore lint/a11y/noAutofocus: This is an example app
                autoFocus
                value={text}
                // 제어 컴포넌트 패턴: React state로 input 값 관리
                onChange={(event) => this.setState({ text: event.target.value })}
                // ref 콜백을 통한 DOM 요소 접근 및 포커스 설정
                ref={(node) => {
                  if (node) {
                    node.focus();
                  }
                }}
              />
              <div>
                {/* 이모지 선택을 위한 라디오 버튼 그룹 */}
                {/* Array.map: 배열의 각 요소를 React 엘리먼트로 변환 */}
                {["💩", "😱", "😍", "🔥", "😳", "⚠️"].map((_emoji) => (
                  // label: 접근성을 위한 input 래퍼
                  <label key={_emoji}>
                    {" "}
                    {/* key: React의 리스트 렌더링 최적화를 위한 고유 식별자 */}
                    <input
                      checked={emoji === _emoji} // 현재 선택된 이모지 체크
                      type="radio"
                      name="emoji"
                      value={_emoji}
                      // 라디오 버튼 선택 시 상태 업데이트
                      onChange={(event) => this.setState({ emoji: event.target.value })}
                    />
                    {_emoji}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <input type="submit" value="Save" />
            </div>
          </form>
        )}
      </div>
    );
  }
}
