"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Maximize, Minimize, ArrowUp, ArrowDown } from "lucide-react";

// Import shadcn-ui components
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Using a publicly available PDF for testing
const samplePdfUrl = "/test/test.pdf";

type ScaleOption = "auto" | "page-width" | "page-height";

export default function SampleViewer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<ScaleOption>("auto");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scaleValue, setScaleValue] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF load error:", error);
    setIsLoading(false);
  }

  // Calculate actual scale value based on the selected option
  const calculateScaleValue = (option: ScaleOption, containerElement: HTMLDivElement | null) => {
    if (!containerElement) return 1;

    const containerWidth = containerElement.clientWidth - (sidebarOpen ? 150 : 0);
    const containerHeight = containerElement.clientHeight;

    switch (option) {
      case "page-width":
        return containerWidth / 595; // Assuming standard A4 width in points
      case "page-height":
        return containerHeight / 842; // Assuming standard A4 height in points
      default:
        return Math.min(containerWidth / 595, containerHeight / 842);
    }
  };

  // Update scale value when scale option or sidebar state changes
  useEffect(() => {
    if (containerRef.current) {
      const newScaleValue = calculateScaleValue(scale, containerRef.current);
      setScaleValue(newScaleValue);
    }
  }, [scale, sidebarOpen, isFullScreen, calculateScaleValue]);

  // Update scale value on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const newScaleValue = calculateScaleValue(scale, containerRef.current);
        setScaleValue(newScaleValue);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scale, calculateScaleValue]);

  // Handle fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Scroll functions
  const scrollUp = () => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollBy({
        top: -100,
        behavior: "smooth",
      });
    }
  };

  const scrollDown = () => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollBy({
        top: 100,
        behavior: "smooth",
      });
    }
  };

  // Handle scale change
  const handleScaleChange = (value: string) => {
    setScale(value as ScaleOption);
  };

  return (
    <Card className={`${isFullScreen ? "w-screen h-screen" : "w-[1000px] h-[600px]"} overflow-hidden flex flex-col`} ref={containerRef}>
      {/* Toolbar */}
      <div className="border-b flex justify-between items-center p-2">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} disabled={isLoading} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </Button>
          <span>{isLoading ? "Loading..." : `Page ${currentPage} of ${numPages || "--"}`}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={scale} onValueChange={handleScaleChange} disabled={isLoading}>
            <SelectTrigger className="w-[130px]" aria-label="Scale options">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="page-width">Page Width</SelectItem>
              <SelectItem value="page-height">Page Height</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={toggleFullScreen} aria-label={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <Document
          file={samplePdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-2">Loading PDF document...</p>
              </div>
            </div>
          }
          error={<div className="flex items-center justify-center h-full w-full text-destructive">Failed to load PDF</div>}
          className="flex flex-1">
          {!isLoading && (
            <>
              {/* Sidebar with thumbnails */}
              {sidebarOpen && (
                <div className="w-[150px] border-r">
                  <ScrollArea className="h-full">
                    {Array.from(new Array(numPages || 0), (_, index) => (
                      <div key={`thumb-${index + 1}`} className={`p-2 cursor-pointer relative ${currentPage === index + 1 ? "bg-accent" : "hover:bg-muted"}`} onClick={() => setCurrentPage(index + 1)}>
                        <Badge variant="secondary" className="absolute top-3 right-3 z-10">
                          {index + 1}
                        </Badge>
                        <Page pageNumber={index + 1} width={130} renderTextLayer={false} renderAnnotationLayer={false} />
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Main document view */}
              <div className="flex-1 overflow-auto p-4 bg-muted relative" ref={mainViewRef}>
                <Page pageNumber={currentPage} scale={scaleValue} renderTextLayer={true} renderAnnotationLayer={true} className="mx-auto" />

                {/* Scroll controls */}
                <div className="absolute right-4 bottom-20 flex flex-col space-y-2">
                  <Button variant="secondary" size="icon" onClick={scrollUp} className="rounded-full shadow" aria-label="Scroll up">
                    <ArrowUp size={18} />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={scrollDown} className="rounded-full shadow" aria-label="Scroll down">
                    <ArrowDown size={18} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Document>
      </div>

      {/* Page navigation controls */}
      <div className="border-t p-2 flex justify-center items-center space-x-4">
        <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1 || isLoading}>
          Previous
        </Button>
        <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, numPages || 1))} disabled={currentPage >= (numPages || 1) || isLoading}>
          Next
        </Button>
      </div>
    </Card>
  );
}
