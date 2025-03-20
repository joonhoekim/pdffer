import { useEffect, useCallback, useRef } from "react";
import { usePdfViewerStore } from "../store/pdfViewerStore";
import type { IHighlight } from "../types";

// Type definition for PDF.js viewer
// We're using a specific interface rather than extending PDFViewer
// because the container property has incompatible types
interface PDFViewerRef {
  currentScale: number;
  currentScaleValue: string;
  spreadMode: number;
  container: HTMLDivElement;
  update(): void;
}

export const usePdfViewer = () => {
  const viewerRef = useRef<PDFViewerRef | null>(null);
  const scrollViewerTo = useRef<(highlight: IHighlight) => void>(() => {});

  // Get state from the store
  const { scaleMode, currentScale, spreadMode, setCurrentScale, setScaleMode, setSpreadMode, getHighlightById } = usePdfViewerStore();

  // Parse ID from URL hash
  const parseIdFromHash = useCallback(() => {
    return document.location.hash.slice("#highlight-".length);
  }, []);

  // Reset URL hash
  const resetHash = useCallback(() => {
    document.location.hash = "";
  }, []);

  // Handle scale value changes
  const handleScaleValue = useCallback(() => {
    if (!viewerRef.current) return;

    // Maintain spread mode
    viewerRef.current.spreadMode = spreadMode;

    if (scaleMode === "auto") {
      // In auto mode, maintain the current scale
      viewerRef.current.currentScale = currentScale;
    } else {
      // In fit modes, apply the corresponding mode
      viewerRef.current.currentScaleValue = scaleMode;
      // Update current scale after mode is applied
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [scaleMode, currentScale, spreadMode, setCurrentScale]);

  // Zoom in function
  const zoomIn = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode("auto"); // Switch to auto mode for manual zooming
      const newScale = Number((viewerRef.current.currentScale * 1.1).toFixed(2));
      viewerRef.current.currentScale = newScale;
      setCurrentScale(newScale);
    }
  }, [setScaleMode, setCurrentScale]);

  // Zoom out function
  const zoomOut = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode("auto"); // Switch to auto mode for manual zooming
      const newScale = Number((viewerRef.current.currentScale / 1.1).toFixed(2));
      viewerRef.current.currentScale = newScale;
      setCurrentScale(newScale);
    }
  }, [setScaleMode, setCurrentScale]);

  // Set auto fit
  const setPageFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode("auto");
      viewerRef.current.currentScaleValue = "auto";
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale, setScaleMode, setCurrentScale]);

  // Set page width fit
  const setPageWidthFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode("page-width");
      viewerRef.current.currentScaleValue = "page-width";
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale, setScaleMode, setCurrentScale]);

  // Set page height fit
  const setPageHeightFit = useCallback(() => {
    if (viewerRef.current) {
      setScaleMode("page-height");
      viewerRef.current.currentScaleValue = "page-height";
      const newScale = viewerRef.current.currentScale;
      if (newScale !== currentScale) {
        setCurrentScale(newScale);
      }
    }
  }, [currentScale, setScaleMode, setCurrentScale]);

  // Toggle spread mode (single/double page view)
  const setTwoPageView = useCallback(() => {
    if (viewerRef.current) {
      const newMode = viewerRef.current.spreadMode === 0 ? 1 : 0;
      viewerRef.current.spreadMode = newMode;
      setSpreadMode(newMode);
    }
  }, [setSpreadMode]);

  // Scroll to highlight identified by URL hash
  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, [getHighlightById, parseIdFromHash]);

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        // TODO: Implement escape behavior if needed
      }

      // Ctrl/Cmd + key shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.code) {
          case "Equal": // Ctrl + Plus
            event.preventDefault();
            zoomIn();
            break;
          case "Minus": // Ctrl + Minus
            event.preventDefault();
            zoomOut();
            break;
          case "Digit0": // Ctrl + 0
            event.preventDefault();
            setPageFit();
            break;
          case "Digit1": // Ctrl + 1
            event.preventDefault();
            setPageWidthFit();
            break;
          case "Digit2": // Ctrl + 2
            event.preventDefault();
            setPageHeightFit();
            break;
          case "Digit3": // Ctrl + 3
            event.preventDefault();
            setTwoPageView();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomIn, zoomOut, setPageFit, setPageWidthFit, setPageHeightFit, setTwoPageView]);

  // Listen for URL hash changes
  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener("hashchange", scrollToHighlightFromHash, false);
    };
  }, [scrollToHighlightFromHash]);

  // Set up resize observer
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

  // Callback for when the PDF viewer is loaded
  const onViewerLoaded = useCallback(
    (viewer: PDFViewerRef) => {
      viewerRef.current = viewer;
      // Set initial spread mode
      viewer.spreadMode = spreadMode;
    },
    [spreadMode],
  );

  // Return all the necessary functions and refs
  return {
    viewerRef,
    scrollViewerTo,
    resetHash,
    zoomIn,
    zoomOut,
    setPageFit,
    setPageWidthFit,
    setPageHeightFit,
    setTwoPageView,
    onViewerLoaded,
    parseIdFromHash,
    scrollToHighlightFromHash,
  };
};
