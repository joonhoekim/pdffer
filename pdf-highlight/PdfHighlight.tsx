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
// import "./style/style.css";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, ZoomIn, ZoomOut, RotateCw, Download, PanelLeftClose, PanelRightClose } from "lucide-react";

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
  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  // URL 해시가 변경될 때 해당 하이라이트로 스크롤하는 함수
  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

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
    setHighlights((prevHighlights) => [{ ...highlight, id: getNextId() }, ...prevHighlights]);
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
    <div className="h-[100dvh] w-[100dvw] flex flex-col">
      {/* 상단 툴바 - 확대/축소, 회전, 다운로드 등의 기능 버튼 */}
      <div className="border-b p-2 flex items-center justify-between shrink-0 bg-background">
        {/* 왼쪽 툴바 버튼 그룹 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowLeftSidebar(!showLeftSidebar)} className={!showLeftSidebar ? "bg-muted" : ""}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="icon">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="icon">
            <RotateCw className="h-4 w-4" />
          </Button>
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
          <div className="h-full relative">
            <div className="absolute inset-0 overflow-auto">
              <PdfLoader url={url} beforeLoad={<Spinner />}>
                {(pdfDocument) => (
                  <PdfHighlighter
                    pdfDocument={pdfDocument}
                    enableAreaSelection={(event) => event.altKey} // Alt 키를 누른 상태에서 영역 선택 가능
                    onScrollChange={resetHash}
                    scrollRef={(scrollTo) => {
                      scrollViewerTo.current = scrollTo;
                      scrollToHighlightFromHash();
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
                        <Popup popupContent={<HighlightPopup {...highlight} />} onMouseOver={(popupContent) => setTip(highlight, (highlight) => popupContent)} onMouseOut={hideTip} key={index}>
                          {component}
                        </Popup>
                      );
                    }}
                    highlights={highlights}
                  />
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
                    <div className="text-sm text-muted-foreground">No notes yet</div>
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
