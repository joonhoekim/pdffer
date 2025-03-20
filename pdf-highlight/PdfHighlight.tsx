"use client";

import React, { useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { usePdfViewerStore } from "./store/pdfViewerStore";
import { Toolbar } from "./components/Toolbar";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { PdfViewerContent } from "./components/PdfViewerContent";
import { testHighlights as _testHighlights } from "./test-highlights";

export default function PdfHighlight() {
  const { showLeftSidebar, showRightSidebar, setTestHighlights } = usePdfViewerStore();

  // Initialize test highlights on component mount
  useEffect(() => {
    setTestHighlights(_testHighlights);
  }, [setTestHighlights]);

  return (
    <div className="h-[100vh] w-[100vw] flex flex-col">
      {/* Toolbar - Zoom, rotation, download buttons */}
      <Toolbar />

      {/* Main content area with sidebars and PDF viewer */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 relative">
        {/* Left sidebar - File selection and preview */}
        {showLeftSidebar && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={50}>
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        {/* PDF viewer - Document display and highlighting */}
        <ResizablePanel defaultSize={showRightSidebar && showLeftSidebar ? 60 : 100}>
          <PdfViewerContent />
        </ResizablePanel>

        {/* Right sidebar - Filter and highlight management */}
        {showRightSidebar && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
              <RightSidebar />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
