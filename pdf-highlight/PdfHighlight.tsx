"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

import { AreaHighlight, Highlight, PdfHighlighter, PdfLoader, Popup, Tip } from "./index";
import type { Content, IHighlight, NewHighlight, ScaledPosition } from "./index";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import { testHighlights as _testHighlights } from "./test-highlights";

// nextjs default config doew not allow import node_modules files directly
// import "react-pdf-highlighter/dist/style.css";

import "./style/App.css";
import "./style/pdf_viewer.css";
// import "./style/style.css";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, ZoomIn, ZoomOut, RotateCw, Download, PanelLeftClose, PanelRightClose, Maximize, ArrowLeftRight, ArrowUpDown, Columns } from "lucide-react";
import { Input } from "@/components/ui/input";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

// 하이라이트 ID 생성을 위한 랜덤 값 생성 함수
const getNextId = () => String(Math.random()).slice(2);

// URL 해시에서 하이라이트 ID를 추출하는 함수
const parseIdFromHash = () => document.location.hash.slice("#highlight-".length);

// URL 해시를 초기화하는 함수
const resetHash = () => {
  document.location.hash = "";
};

// 하이라이트 팝업 컴포넌트 - 텍스트와 이모지를 표시
const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

// 기본 PDF URL 설정
const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
// const PRIMARY_PDF_URL = "/pdf-example/test-big.pdf";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

export default function PdfHighlight() {
  // URL 파라미터에서 PDF URL을 가져오거나 기본 URL 사용
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

  // 상태 관리
  const [url, setUrl] = useState(initialUrl); // 현재 PDF URL
  const [highlights, setHighlights] = useState<Array<IHighlight>>(testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : []); // 하이라이트 목록
  const [showLeftSidebar, setShowLeftSidebar] = useState(true); // 왼쪽 사이드바 표시 여부
  const [showRightSidebar, setShowRightSidebar] = useState(true); // 오른쪽 사이드바 표시 여부
  const [scaleMode, setScaleMode] = useState<'auto' | 'page-width' | 'page-height'>('auto'); // PDF 스케일 모드
  const [currentScale, setCurrentScale] = useState<number>(1); // 현재 배율
  const [spreadMode, setSpreadMode] = useState<0 | 1>(0); // 0: 한 쪽 보기, 1: 두 쪽 보기
  
  // PDF 뷰어 참조
  const viewerRef = useRef<any>(null);

  // 스케일 값 변경 처리
  const handleScaleValue = useCallback(() => {
    if (!viewerRef.current) return;

    // spread mode 유지
    viewerRef.current.spreadMode = spreadMode;

    if (scaleMode === 'auto') {
      // auto 모드에서는 현재 배율 유지
      viewerRef.current.currentScale = currentScale;
    } else {
      // 맞춤 모드에서는 해당 모드 적용
      viewerRef.current.currentScaleValue = scaleMode;
      // 모드 적용 후 현재 배율 업데이트
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [scaleMode, currentScale, spreadMode]);

  // resize 이벤트 리스너 등록
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleScaleValue();
    });

    if (viewerRef.current?.container) {
      resizeObserver.observe(viewerRef.current.container);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleScaleValue]);

  // 확대/축소 및 보기 맞춤 메서드
  const zoomIn = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode('auto');  // 수동 확대/축소 시 auto 모드로 전환
      const newScale = Number((viewerRef.current.currentScale * 1.1).toFixed(2));
      viewerRef.current.currentScale = newScale;
      setCurrentScale(newScale);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode('auto');  // 수동 확대/축소 시 auto 모드로 전환
      const newScale = Number((viewerRef.current.currentScale / 1.1).toFixed(2));
      viewerRef.current.currentScale = newScale;
      setCurrentScale(newScale);
    }
  }, []);

  const setPageFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode('auto');
      // PDF가 화면에 맞게 자동으로 조정되도록 함
      viewerRef.current.currentScaleValue = 'auto';
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale]);

  const setPageWidthFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode('page-width');
      viewerRef.current.currentScaleValue = 'page-width';
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale]);

  const setPageHeightFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode('page-height');
      viewerRef.current.currentScaleValue = 'page-height';
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale]);

  const setTwoPageView = useCallback(() => {
    if (viewerRef.current) {
      const newMode = viewerRef.current.spreadMode === 0 ? 1 : 0;
      viewerRef.current.spreadMode = newMode;
      setSpreadMode(newMode);
    }
  }, []);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === "Escape") {
      // TODO
    }
    
    // Ctrl + 키보드 단축키
    if (event.ctrlKey || event.metaKey) {
      switch(event.code) {
        case "Equal":  // Ctrl + Plus
          event.preventDefault();
          zoomIn();
          break;
        case "Minus":  // Ctrl + Minus
          event.preventDefault();
          zoomOut();
          break;
        case "Digit0":  // Ctrl + 0
          event.preventDefault();
          setPageFit();
          break;
        case "Digit1":  // Ctrl + 1
          event.preventDefault();
          setPageWidthFit();
          break;
        case "Digit2":  // Ctrl + 2
          event.preventDefault();
          setPageHeightFit();
          break;
        case "Digit3":  // Ctrl + 3
          event.preventDefault();
          setTwoPageView();
          break;
      }
    }
  }, [zoomIn, zoomOut, setPageFit, setPageWidthFit, setPageHeightFit, setTwoPageView]);

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // PDF 뷰어 참조 설정
  const onViewerLoaded = useCallback((viewer: any) => {
    viewerRef.current = viewer;
    // 초기 spread mode 설정
    viewer.spreadMode = spreadMode;
  }, [spreadMode]);

  // 모든 하이라이트를 초기화하는 함수
  const resetHighlights = () => {
    setHighlights([]);
  };

  // PDF 문서를 전환하는 함수
  const toggleDocument = () => {
    const newUrl = url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  // PDF 뷰어 스크롤 참조
  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => {});

  // URL 해시가 변경될 때 해당 하이라이트로 스크롤하는 함수
  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, [highlights]);

  // 해시 변경 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener("hashchange", scrollToHighlightFromHash, false);
    };
  }, [scrollToHighlightFromHash]);

  // ID로 하이라이트를 찾는 함수
  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  // 새로운 하이라이트를 추가하는 함수
  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    const newHighlight = { ...highlight, id: getNextId() };
    setHighlights((prevHighlights) => [newHighlight, ...prevHighlights]);
    
    // 새로 추가된 하이라이트로 스크롤
    document.location.hash = `highlight-${newHighlight.id}`;
    
    // 하이라이트 추가 후 현재 설정 유지
    if (viewerRef.current) {
      // spread mode 유지
      viewerRef.current.spreadMode = spreadMode;
      
      // scale mode 유지
      if (scaleMode === 'auto') {
        viewerRef.current.currentScale = currentScale;
      } else {
        viewerRef.current.currentScaleValue = scaleMode;
      }
    }
  };

  // 기존 하이라이트를 업데이트하는 함수
  const updateHighlight = (highlightId: string, position: Partial<ScaledPosition>, content: Partial<Content>) => {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const { id, position: originalPosition, content: originalContent, ...rest } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      }),
    );
  };

  return (
    <div className="h-[100vh] w-[100vw] flex flex-col">
      {/* 상단 툴바 - 확대/축소, 회전, 다운로드 등의 기능 버튼 */}
      <div className="border-b p-2 flex items-center justify-between shrink-0 bg-background">
        {/* 왼쪽 툴바 버튼 그룹 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowLeftSidebar(!showLeftSidebar)} className={!showLeftSidebar ? "bg-muted" : ""}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="icon" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <div className="relative w-20">
              <Input
                type="number"
                min="25"
                max="500"
                step="5"
                value={Math.round(currentScale * 100)}
                onChange={(e) => {
                  const newScale = Number(e.target.value) / 100;
                  if (!isNaN(newScale) && newScale >= 0.25 && newScale <= 5) {
                    if (viewerRef.current) {
                      requestAnimationFrame(() => {
                        setScaleMode('auto');
                        viewerRef.current.currentScale = newScale;
                        setCurrentScale(newScale);
                      });
                    }
                  }
                }}
                className="pr-7 text-right"
              />
              <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground text-sm">
                %
              </span>
            </div>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button variant={scaleMode === 'auto' ? "secondary" : "outline"} size="icon" onClick={setPageFit}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant={scaleMode === 'page-width' ? "secondary" : "outline"} size="icon" onClick={setPageWidthFit}>
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <Button variant={scaleMode === 'page-height' ? "secondary" : "outline"} size="icon" onClick={setPageHeightFit}>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button variant={spreadMode === 1 ? "secondary" : "outline"} size="icon" onClick={setTwoPageView}>
            <Columns className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
        {/* 오른쪽 툴바 버튼 그룹 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="icon" onClick={() => setShowRightSidebar(!showRightSidebar)} className={!showRightSidebar ? "bg-muted" : ""}>
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 - 사이드바와 PDF 뷰어를 포함 */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
        {/* 왼쪽 사이드바 - 하이라이트 목록 표시 */}
        {showLeftSidebar && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <div className="h-full overflow-auto">
                <ScrollArea className="h-full">
                  <Sidebar highlights={highlights} resetHighlights={resetHighlights} toggleDocument={toggleDocument} />
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        {/* PDF 뷰어 - 문서 표시 및 하이라이트 기능 */}
        <ResizablePanel defaultSize={showLeftSidebar && showRightSidebar ? 60 : 100}>
          <div className="h-full w-full relative overflow-hidden">
            {/* PDF 뷰어 컨테이너 - position: relative로 설정하여 PDF.js 컨테이너의 부모 역할 */}
            <div className="absolute inset-0">
              {/* pdf-js 워커 주소를 별도로 지정하려면 아래에서 workSrc 프롭을 넣어줄 것. 기본값은 pdfjs-dist 버전과 동일한 워커를 CDN으로 가져옴 */}
              <PdfLoader url={url} beforeLoad={<Spinner />}>
                {(pdfDocument) => (
                  <div className="relative w-full h-full">
                    <PdfHighlighter
                      pdfDocument={pdfDocument}
                      enableAreaSelection={(event) => event.altKey} // Alt 키를 누른 상태에서 영역 선택 가능
                      onScrollChange={resetHash}
                      scrollRef={(scrollTo) => {
                        scrollViewerTo.current = scrollTo;
                        scrollToHighlightFromHash();
                      }}
                      onViewerLoaded={onViewerLoaded}
                      pdfViewerOptions={{
                        spreadMode: spreadMode,
                        scaleMode: scaleMode,
                        defaultScale: currentScale,
                      }}
                      // 텍스트 선택 완료 시 팁(코멘트 입력) 표시
                      onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                        <Tip
                          onOpen={transformSelection}
                          onConfirm={(comment) => {
                            addHighlight({ content, position, comment });
                            hideTipAndSelection();
                          }}
                        />
                      )}
                      // 하이라이트 렌더링 변환 함수
                      highlightTransform={(highlight, index, setTip, hideTip, viewportToScaled, screenshot, isScrolledTo) => {
                        const isTextHighlight = !highlight.content?.image;

                        const component = isTextHighlight ? (
                          <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />
                        ) : (
                          <AreaHighlight
                            isScrolledTo={isScrolledTo}
                            highlight={highlight}
                            onChange={(boundingRect) => {
                              updateHighlight(highlight.id, { boundingRect: viewportToScaled(boundingRect) }, { image: screenshot(boundingRect) });
                            }}
                          />
                        );

                        return (
                          <Popup popupContent={<HighlightPopup {...highlight} />} onMouseOver={(popupContent) => setTip(highlight, () => popupContent)} onMouseOut={hideTip} key={index}>
                            {component}
                          </Popup>
                        );
                      }}
                      highlights={highlights}
                    />
                  </div>
                )}
              </PdfLoader>
            </div>
          </div>
        </ResizablePanel>

        {/* 오른쪽 사이드바 - 문서 정보와 노트 표시 */}
        {showRightSidebar && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <div className="h-full overflow-auto">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <h3 className="text-lg font-semibold">Document Info</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Title: Sample Document</p>
                      <p className="text-sm text-muted-foreground">Pages: 10</p>
                      <p className="text-sm text-muted-foreground">Created: 2024-03-21</p>
                    </div>
                    <Separator />
                    <h3 className="text-lg font-semibold">Notes</h3>
                    <div className="space-y-2">
                      <p className="text-sm">No notes yet.</p>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
