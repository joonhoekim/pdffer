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
import "./style/style.css";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, ZoomIn, ZoomOut, RotateCw, Download, PanelLeftClose, PanelRightClose } from "lucide-react";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () => document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

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

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

export default function PdfHighlight() {
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

  console.log("initialUrl", initialUrl);

  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : []);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl = url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener("hashchange", scrollToHighlightFromHash, false);
    };
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [{ ...highlight, id: getNextId() }, ...prevHighlights]);
  };

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
      {/* Top Toolbar */}
      <div className="border-b p-2 flex items-center justify-between shrink-0 bg-background">
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

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
        {/* Left Sidebar */}
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

        {/* PDF Viewer */}
        <ResizablePanel defaultSize={showLeftSidebar && showRightSidebar ? 60 : 100}>
          <div className="h-full relative">
            <div className="absolute inset-0 overflow-auto">
              <PdfLoader url={url} beforeLoad={<Spinner />}>
                {(pdfDocument) => (
                  <PdfHighlighter
                    pdfDocument={pdfDocument}
                    enableAreaSelection={(event) => event.altKey}
                    onScrollChange={resetHash}
                    scrollRef={(scrollTo) => {
                      scrollViewerTo.current = scrollTo;
                      scrollToHighlightFromHash();
                    }}
                    onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                      <Tip
                        onOpen={transformSelection}
                        onConfirm={(comment) => {
                          addHighlight({ content, position, comment });
                          hideTipAndSelection();
                        }}
                      />
                    )}
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

        {/* Right Sidebar */}
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
