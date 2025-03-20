"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search, ZoomIn, ZoomOut, Download, PanelLeftClose, PanelRightClose, Maximize, ArrowLeftRight, ArrowUpDown, Columns } from "lucide-react";
import { usePdfViewerStore } from "../store/pdfViewerStore";
import { usePdfViewer } from "../hooks/usePdfViewer";

export const Toolbar: React.FC = () => {
  const { scaleMode, currentScale, spreadMode, showLeftSidebar, showRightSidebar, toggleLeftSidebar, toggleRightSidebar, setCurrentScale } = usePdfViewerStore();

  const { zoomIn, zoomOut, setPageFit, setPageWidthFit, setPageHeightFit, setTwoPageView } = usePdfViewer();

  return (
    <div className="border-b p-2 flex items-center justify-between shrink-0 bg-background">
      {/* Left toolbar button group */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={toggleLeftSidebar} className={!showLeftSidebar ? "bg-muted" : ""}>
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
                  setCurrentScale(newScale);
                }
              }}
              className="pr-7 text-right"
            />
            <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted-foreground text-sm">%</span>
          </div>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <Button variant={scaleMode === "auto" ? "secondary" : "outline"} size="icon" onClick={setPageFit}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant={scaleMode === "page-width" ? "secondary" : "outline"} size="icon" onClick={setPageWidthFit}>
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <Button variant={scaleMode === "page-height" ? "secondary" : "outline"} size="icon" onClick={setPageHeightFit}>
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

      {/* Right toolbar button group */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="icon" onClick={toggleRightSidebar} className={!showRightSidebar ? "bg-muted" : ""}>
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
