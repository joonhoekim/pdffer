"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, createContext, useContext } from "react";

// 컨텍스트 컨텍스트 생성
const ThemeContext = createContext("light");

// 훅 색상
const hookColors = {
  Component: "#9c9c9c",
  useState: "#61dafb",
  useRef: "#FFD700",
  useEffect: "#4CAF50",
  useLayoutEffect: "#FF5722",
  useMemo: "#9C27B0",
  useCallback: "#2196F3",
  useContext: "#E91E63",
};

// 로그 타입에 따른 아이콘
const typeIcons = {
  start: "🚀",
  init: "🔧",
  process: "⚙️",
  effect: "✨",
  cleanup: "🧹",
  action: "👆",
  measure: "📏",
  connection: "🔌",
  info: "ℹ️",
};

// 훅 설명
const hookExplanations = {
  useState: "컴포넌트의 상태를 관리하는 훅으로, 렌더링 전에 즉시 값을 설정합니다. '탁!' 하고 상태값을 내려놓고, '턱!' 하고 업데이트 함수를 제공합니다.",
  useRef: "값을 저장하지만 변경 시 리렌더링을 일으키지 않는 훅입니다. DOM 요소에 연결하면 '딱!' 소리와 함께 실제 요소를 참조합니다. 첫 렌더링에서는 '뚝...' 하고 비어있습니다.",
  useEffect: "렌더링이 완료되고 화면이 그려진 후에 '후루룩~' 소리와 함께 실행됩니다. 비동기 작업, 구독, 타이머 등에 적합합니다.",
  useLayoutEffect: "DOM 변경 직후, 브라우저가 화면을 그리기 전에 '슉! 팍!' 소리와 함께 동기적으로 실행됩니다. 사용자가 보기 전에 시각적 업데이트가 필요할 때 사용합니다.",
  useMemo: "계산 비용이 많이 드는 값을 메모이제이션합니다. '찰칵!' 하고 계산 결과를 저장하고, 의존성이 변경되지 않으면 '철컥!' 하고 재사용합니다.",
  useCallback: "함수를 메모이제이션합니다. '찰칵! 철컥!' 소리와 함께 함수 참조를 저장하고, 필요할 때마다 같은 함수를 재사용합니다.",
  useContext: "컨텍스트에서 값을 읽고 구독합니다. '샤라랑~' 소리와 함께 컨텍스트 값이 변경되면 컴포넌트에 알립니다.",
};

const HooksExplorer = () => {
  // 상태 관리
  const [logs, setLogs] = useState([]);
  const [showExplanation, setShowExplanation] = useState({});
  const [activeHook, setActiveHook] = useState(null);
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("light");
  const isFirstRender = useRef(true);
  const renderCountRef = useRef(0);
  const buttonRef = useRef(null);

  // 로그 추가 함수
  const addLog = (hook, message, type = "info") => {
    setLogs((prev) => [...prev, { hook, message, type, timestamp: new Date().getTime() }]);
  };

  // 로그 초기화
  const clearLogs = () => {
    setLogs([]);
    renderCountRef.current = 0;
  };

  // 컴포넌트 첫 렌더링 시 초기 로그 추가
  useEffect(() => {
    if (isFirstRender.current) {
      addLog("Component", "🎭 컴포넌트 함수 본문 실행 시작!", "start");
      addLog("useState", '"탁! 턱!" - 상태값과 업데이트 함수를 즉시 준비해요', "init");
      addLog("useRef", '"뚝..." - 일단 빈 그릇을 들고 기다려요', "init");
      addLog("useMemo", '"찰칵!" - 계산 결과를 준비해요', "init");
      addLog("useCallback", '"찰칵! 철컥!" - 함수를 메모리에 저장해요', "init");
      addLog("useContext", '"샤라랑~" - 컨텍스트 값을 받아와요', "init");
      isFirstRender.current = false;
    }
  }, []);

  // 렌더 카운트 증가 및 로깅
  useEffect(() => {
    renderCountRef.current += 1;
    addLog("Component", `렌더링 횟수: ${renderCountRef.current}`, "info");
  }, [count, theme]);

  // === useMemo 훅 ===
  const expensiveValue = useMemo(() => {
    if (!isFirstRender.current) {
      addLog("useMemo", '"철컥!" - 무거운 계산 중...', "process");
    }
    return count * count * count;
  }, [count]);

  // === useCallback 훅 ===
  const handleCountChange = useCallback((delta) => {
    addLog("useCallback", "저장된 함수가 호출되었어요!", "action");
    setCount((prev) => prev + delta);
  }, []);

  // === useContext 훅 ===
  const currentTheme = useContext(ThemeContext);

  // === useLayoutEffect 훅 ===
  useLayoutEffect(() => {
    if (!isFirstRender.current) {
      addLog("useLayoutEffect", '"슉! 팍!" - DOM 업데이트 직후, 화면 그리기 전에 실행돼요', "effect");

      if (buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        addLog("useLayoutEffect", `버튼 너비: ${Math.round(buttonWidth)}px (화면 그리기 전에 측정)`, "measure");
      }
    }

    return () => {
      if (!isFirstRender.current) {
        addLog("useLayoutEffect", "정리 함수 실행 - 이전 작업을 정리해요", "cleanup");
      }
    };
  }, [count]);

  // === useEffect 훅 ===
  useEffect(() => {
    if (!isFirstRender.current) {
      // 약간의 지연을 주어 useLayoutEffect와의 차이를 시각화
      const timer = setTimeout(() => {
        addLog("useEffect", '"후루룩~" - 화면이 다 그려진 후에 느긋하게 실행돼요', "effect");
        document.title = `현재 카운트: ${count}`;
      }, 500);

      return () => {
        addLog("useEffect", "정리 함수 실행 - 타이머와 같은 자원을 정리해요", "cleanup");
        clearTimeout(timer);
      };
    }
  }, [count]);

  // === useRef DOM 연결 확인 ===
  useEffect(() => {
    if (buttonRef.current && !isFirstRender.current) {
      addLog("useRef", '"딱!" - 이제 DOM 요소와 연결됐어요', "connection");
    }
  }, []);

  // 훅 설명 토글
  const toggleExplanation = (hook) => {
    setShowExplanation((prev) => ({
      ...prev,
      [hook]: !prev[hook],
    }));
  };

  // 컨텍스트 변경 핸들러
  const handleThemeChange = () => {
    addLog("useState", "컨텍스트 상태가 변경되었어요!", "action");
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  // 로그 필터링
  const filteredLogs = activeHook ? logs.filter((log) => log.hook === activeHook) : logs;

  return (
    <div className={`p-6 max-w-4xl mx-auto ${currentTheme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-800"}`}>
      <h1 className="text-2xl font-bold mb-6">React 훅들의 비밀 파티 🎭</h1>

      {/* 컨트롤 패널 */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-100 rounded-lg shadow-md">
        <button onClick={() => handleCountChange(1)} ref={buttonRef} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          카운트 증가 (+1)
        </button>
        <button onClick={() => handleCountChange(-1)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          카운트 감소 (-1)
        </button>
        <button onClick={handleThemeChange} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
          컨텍스트 변경
        </button>
        <button onClick={clearLogs} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          로그 초기화
        </button>
      </div>

      {/* 현재 상태 디스플레이 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-100 rounded shadow">
          <h3 className="font-bold">카운트 (useState)</h3>
          <p className="text-2xl">{count}</p>
        </div>
        <div className="p-4 bg-purple-100 rounded shadow">
          <h3 className="font-bold">계산값 (useMemo)</h3>
          <p className="text-2xl">{expensiveValue}</p>
        </div>
        <div className="p-4 bg-yellow-100 rounded shadow">
          <h3 className="font-bold">렌더링 횟수 (useRef)</h3>
          <p className="text-2xl">{renderCountRef.current}</p>
        </div>
      </div>

      {/* 훅 필터 버튼 */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">훅 필터</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveHook(null)} className={`px-3 py-1 rounded ${!activeHook ? "bg-gray-700 text-white" : "bg-gray-200"}`}>
            모두 보기
          </button>
          {Object.keys(hookColors).map((hook) => (
            <button
              key={hook}
              onClick={() => setActiveHook(hook)}
              className={`px-3 py-1 rounded ${activeHook === hook ? "text-white" : ""}`}
              style={{
                backgroundColor: activeHook === hook ? hookColors[hook] : "#f0f0f0",
                color: activeHook === hook ? "white" : "black",
              }}>
              {hook}
            </button>
          ))}
        </div>
      </div>

      {/* 훅 설명 */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">훅 설명</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(hookExplanations).map((hook) => (
            <div
              key={hook}
              className="p-3 rounded-lg shadow cursor-pointer"
              style={{ backgroundColor: `${hookColors[hook]}20`, borderLeft: `4px solid ${hookColors[hook]}` }}
              onClick={() => toggleExplanation(hook)}>
              <div className="flex justify-between items-center">
                <h4 className="font-bold">{hook}</h4>
                <span>{showExplanation[hook] ? "▼" : "▶"}</span>
              </div>
              {showExplanation[hook] && <p className="mt-2">{hookExplanations[hook]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* 실행 로그 */}
      <div>
        <h3 className="font-bold mb-2">실행 로그</h3>
        <div className="border rounded-lg overflow-hidden shadow-md max-h-96 overflow-y-auto bg-gray-50">
          {filteredLogs.length > 0 ? (
            <ul className="divide-y">
              {filteredLogs.map((log, idx) => (
                <li key={idx} className="p-2 flex items-start" style={{ borderLeft: `4px solid ${hookColors[log.hook] || "#ccc"}` }}>
                  <span className="mr-2">{typeIcons[log.type]}</span>
                  <div>
                    <span className="font-mono px-2 py-0.5 rounded text-sm font-bold" style={{ backgroundColor: hookColors[log.hook], color: "white" }}>
                      {log.hook}
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-gray-500">아직 로그가 없습니다. 위 버튼을 클릭해보세요!</p>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [appTheme, setAppTheme] = useState("light");

  return (
    <ThemeContext.Provider value={appTheme}>
      <HooksExplorer />
    </ThemeContext.Provider>
  );
};

export default App;
