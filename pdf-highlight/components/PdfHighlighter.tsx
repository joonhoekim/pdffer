"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EventBus, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import type { PDFViewerOptions } from "pdfjs-dist/types/web/pdf_viewer";
import React, { type PointerEventHandler, useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { type Root, createRoot } from "react-dom/client";
import { debounce } from "ts-debounce";
import { scaledToViewport, viewportToScaled } from "../lib/coordinates";
import { getAreaAsPNG } from "../lib/get-area-as-png";
import { getBoundingRect } from "../lib/get-bounding-rect";
import { getClientRects } from "../lib/get-client-rects";
import { findOrCreateContainerLayer, getPageFromElement, getPagesFromRange, getWindow, isHTMLElement } from "../lib/pdfjs-dom";
import styles from "../style/PdfHighlighter.module.css";
import type { IHighlight, LTWH, LTWHP, Position, Scaled, ScaledPosition } from "../types";
import { HighlightLayer } from "./HighlightLayer";
import { MouseSelection } from "./MouseSelection";
import { TipContainer } from "./TipContainer";

export type T_ViewportHighlight<T_HT> = { position: Position } & T_HT;

interface State<T_HT> {
  // temporary highlight while highlighting
  ghostHighlight: {
    position: ScaledPosition;
    content?: { text?: string; image?: string };
  } | null;
  // Text selection is collapsed
  isCollapsed: boolean;
  // Current text selection
  range: Range | null;
  // Current tooltip
  tip: {
    highlight: T_ViewportHighlight<T_HT>;
    callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element;
  } | null;
  // Position of the tooltip
  tipPosition: Position | null;
  // Content of the tooltip
  tipChildren: JSX.Element | null;
  // Whether area selection is in progress
  isAreaSelectionInProgress: boolean;
  // ID of the highlight that is scrolled to
  scrolledToHighlightId: string;
}

interface Props<T_HT> {
  // How to render highlights
  highlightTransform: (
    highlight: T_ViewportHighlight<T_HT>,
    index: number,
    setTip: (highlight: T_ViewportHighlight<T_HT>, callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element) => void,
    hideTip: () => void,
    viewportToScaled: (rect: LTWHP) => Scaled,
    screenshot: (position: LTWH) => string,
    isScrolledTo: boolean,
  ) => JSX.Element;
  // List of highlights
  highlights: Array<T_HT>;
  // Callback when the scroll position changes
  onScrollChange: () => void;
  // Callback when the scroll position is set
  scrollRef: (scrollTo: (highlight: T_HT) => void) => void;
  // PDF document
  pdfDocument: PDFDocumentProxy;
  // PDF scale value
  pdfScaleValue: string;
  // Callback when selection is finished
  onSelectionFinished: (position: ScaledPosition, content: { text?: string; image?: string }, hideTipAndSelection: () => void, transformSelection: () => void) => JSX.Element | null;
  // Whether area selection is enabled
  enableAreaSelection: (event: MouseEvent) => boolean;
  // PDF viewer options
  pdfViewerOptions?: PDFViewerOptions;
}

const EMPTY_ID = "empty-id";

export function PdfHighlighter<T_HT extends IHighlight>(props: Props<T_HT>) {
  const { pdfDocument, pdfViewerOptions, pdfScaleValue = "auto", highlights, onScrollChange, scrollRef, onSelectionFinished, enableAreaSelection, highlightTransform } = props;

  // State
  const [state, setState] = useState<State<T_HT>>({
    ghostHighlight: null,
    isCollapsed: true,
    range: null,
    scrolledToHighlightId: EMPTY_ID,
    isAreaSelectionInProgress: false,
    tip: null,
    tipPosition: null,
    tipChildren: null,
  });

  // Refs
  const viewerRef = useRef<PDFViewer | null>(null);
  const containerNodeRef = useRef<HTMLDivElement>(null);
  const highlightRootsRef = useRef<{
    [page: number]: { reactRoot: Root; container: Element };
  }>({});
  const unsubscribeRef = useRef<() => void>(() => {});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Initialize resize observer
  useEffect(() => {
    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(debouncedScaleValue);
    }
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  const findOrCreateHighlightLayer = useCallback((page: number) => {
    if (!viewerRef.current) return null;

    const { textLayer } = viewerRef.current.getPageView(page - 1) || {};

    if (!textLayer) {
      return null;
    }

    return findOrCreateContainerLayer(textLayer.div, `PdfHighlighter__highlight-layer ${styles.highlightLayer}`, ".PdfHighlighter__highlight-layer");
  }, []);

  const groupHighlightsByPage = useCallback(
    (
      highlights: Array<T_HT>,
    ): {
      [pageNumber: string]: Array<T_HT>;
    } => {
      const { ghostHighlight } = state;

      const allHighlights = [...highlights, ghostHighlight].filter(Boolean) as T_HT[];

      const pageNumbers = new Set<number>();
      for (const highlight of allHighlights) {
        pageNumbers.add(highlight.position.pageNumber);
        for (const rect of highlight.position.rects) {
          if (rect.pageNumber) {
            pageNumbers.add(rect.pageNumber);
          }
        }
      }

      const groupedHighlights: Record<number, T_HT[]> = {};

      for (const pageNumber of pageNumbers) {
        groupedHighlights[pageNumber] = groupedHighlights[pageNumber] || [];
        for (const highlight of allHighlights) {
          const pageSpecificHighlight = {
            ...highlight,
            position: {
              pageNumber,
              boundingRect: highlight.position.boundingRect,
              rects: [],
              usePdfCoordinates: highlight.position.usePdfCoordinates,
            } as ScaledPosition,
          };
          let anyRectsOnPage = false;
          for (const rect of highlight.position.rects) {
            if (pageNumber === (rect.pageNumber || highlight.position.pageNumber)) {
              pageSpecificHighlight.position.rects.push(rect);
              anyRectsOnPage = true;
            }
          }
          if (anyRectsOnPage || pageNumber === highlight.position.pageNumber) {
            groupedHighlights[pageNumber].push(pageSpecificHighlight);
          }
        }
      }

      return groupedHighlights;
    },
    [state.ghostHighlight],
  );

  const hideTipAndSelection = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      tipPosition: null,
      tipChildren: null,
      ghostHighlight: null,
      tip: null,
    }));

    // Need to call renderHighlightLayers after state update
    setTimeout(() => renderHighlightLayers(), 0);
  }, []);

  const setTip = useCallback((position: Position, inner: JSX.Element | null) => {
    setState((prevState) => ({
      ...prevState,
      tipPosition: position,
      tipChildren: inner,
    }));
  }, []);

  const showTip = useCallback(
    (highlight: T_ViewportHighlight<T_HT>, content: JSX.Element) => {
      const { isCollapsed, ghostHighlight, isAreaSelectionInProgress } = state;

      const highlightInProgress = !isCollapsed || ghostHighlight;

      if (highlightInProgress || isAreaSelectionInProgress) {
        return;
      }

      setTip(highlight.position, content);
    },
    [state, setTip],
  );

  const scaledPositionToViewport = useCallback(({ pageNumber, boundingRect, rects, usePdfCoordinates }: ScaledPosition): Position => {
    if (!viewerRef.current) return { boundingRect, rects: [], pageNumber };

    const viewport = viewerRef.current.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: scaledToViewport(boundingRect, viewport, usePdfCoordinates),
      rects: (rects || []).map((rect) => scaledToViewport(rect, viewport, usePdfCoordinates)),
      pageNumber,
    };
  }, []);

  const viewportPositionToScaled = useCallback(({ pageNumber, boundingRect, rects }: Position): ScaledPosition => {
    if (!viewerRef.current) return { boundingRect, rects: [], pageNumber };

    const viewport = viewerRef.current.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: viewportToScaled(boundingRect, viewport),
      rects: (rects || []).map((rect) => viewportToScaled(rect, viewport)),
      pageNumber,
    };
  }, []);

  const screenshot = useCallback((position: LTWH, pageNumber: number) => {
    if (!viewerRef.current) return "";

    const canvas = viewerRef.current.getPageView(pageNumber - 1).canvas;
    return getAreaAsPNG(canvas, position);
  }, []);

  const renderTip = useCallback(() => {
    const { tipPosition, tipChildren } = state;
    if (!tipPosition || !viewerRef.current) return null;

    const { boundingRect, pageNumber } = tipPosition;
    const page = {
      node: viewerRef.current.getPageView((boundingRect.pageNumber || pageNumber) - 1).div,
      pageNumber: boundingRect.pageNumber || pageNumber,
    };

    const pageBoundingClientRect = page.node.getBoundingClientRect();

    const pageBoundingRect = {
      bottom: pageBoundingClientRect.bottom,
      height: pageBoundingClientRect.height,
      left: pageBoundingClientRect.left,
      right: pageBoundingClientRect.right,
      top: pageBoundingClientRect.top,
      width: pageBoundingClientRect.width,
      x: pageBoundingClientRect.x,
      y: pageBoundingClientRect.y,
      pageNumber: page.pageNumber,
    };

    return (
      <TipContainer
        scrollTop={viewerRef.current.container.scrollTop}
        pageBoundingRect={pageBoundingRect}
        style={{
          left: page.node.offsetLeft + boundingRect.left + boundingRect.width / 2,
          top: boundingRect.top + page.node.offsetTop,
          bottom: boundingRect.top + page.node.offsetTop + boundingRect.height,
        }}>
        {tipChildren}
      </TipContainer>
    );
  }, [state.tipPosition, state.tipChildren]);

  const handleScaleValue = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.currentScaleValue = pdfScaleValue;
    }
  }, [pdfScaleValue]);

  const debouncedScaleValue = useMemo(() => debounce(handleScaleValue, 500), [handleScaleValue]);

  const toggleTextSelection = useCallback((flag: boolean) => {
    if (!viewerRef.current?.viewer) {
      return;
    }
    viewerRef.current.viewer.classList.toggle(styles.disableSelection, flag);
  }, []);

  const scrollTo = useCallback((highlight: T_HT) => {
    if (!viewerRef.current) return;

    const { pageNumber, boundingRect, usePdfCoordinates } = highlight.position;

    viewerRef.current.container.removeEventListener("scroll", onScroll);

    const pageViewport = viewerRef.current.getPageView(pageNumber - 1).viewport;

    const scrollMargin = 10;

    viewerRef.current.scrollPageIntoView({
      pageNumber,
      destArray: [null, { name: "XYZ" }, ...pageViewport.convertToPdfPoint(0, scaledToViewport(boundingRect, pageViewport, usePdfCoordinates).top - scrollMargin), 0],
    });

    setState((prevState) => ({
      ...prevState,
      scrolledToHighlightId: highlight.id,
    }));

    // Need to call renderHighlightLayers after state update
    setTimeout(() => renderHighlightLayers(), 0);

    // wait for scrolling to finish
    setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.container.addEventListener("scroll", onScroll);
      }
    }, 100);
  }, []);

  const onScroll = useCallback(() => {
    onScrollChange();

    setState((prevState) => ({
      ...prevState,
      scrolledToHighlightId: EMPTY_ID,
    }));

    // Need to call renderHighlightLayers after state update
    setTimeout(() => renderHighlightLayers(), 0);

    if (viewerRef.current) {
      viewerRef.current.container.removeEventListener("scroll", onScroll);
    }
  }, [onScrollChange]);

  const onTextLayerRendered = useCallback(() => {
    renderHighlightLayers();
  }, []);

  const onDocumentReady = useCallback(() => {
    handleScaleValue();
    scrollRef(scrollTo);
  }, [handleScaleValue, scrollRef, scrollTo]);

  const afterSelection = useCallback(() => {
    const { isCollapsed, range } = state;

    if (!range || isCollapsed) {
      return;
    }

    const pages = getPagesFromRange(range);

    if (!pages || pages.length === 0) {
      return;
    }

    const rects = getClientRects(range, pages);

    if (rects.length === 0) {
      return;
    }

    const boundingRect = getBoundingRect(rects);

    const viewportPosition: Position = {
      boundingRect,
      rects,
      pageNumber: pages[0].number,
    };

    const content = {
      text: range.toString(),
    };
    const scaledPosition = viewportPositionToScaled(viewportPosition);

    setTip(
      viewportPosition,
      onSelectionFinished(
        scaledPosition,
        content,
        () => hideTipAndSelection(),
        () => {
          setState((prevState) => ({
            ...prevState,
            ghostHighlight: { position: scaledPosition },
          }));

          // Need to call renderHighlightLayers after state update
          setTimeout(() => renderHighlightLayers(), 0);
        },
      ),
    );
  }, [state.isCollapsed, state.range, hideTipAndSelection, onSelectionFinished, viewportPositionToScaled, setTip]);

  const debouncedAfterSelection = useMemo(() => debounce(afterSelection, 500), [afterSelection]);

  const onSelectionChange = useCallback(() => {
    const container = containerNodeRef.current;
    if (!container) {
      return;
    }

    const selection = getWindow(container).getSelection();
    if (!selection) {
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (selection.isCollapsed) {
      setState((prevState) => ({ ...prevState, isCollapsed: true }));
      return;
    }

    if (!range || !container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    setState((prevState) => ({
      ...prevState,
      isCollapsed: false,
      range,
    }));

    debouncedAfterSelection();
  }, [debouncedAfterSelection]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        hideTipAndSelection();
      }
    },
    [hideTipAndSelection],
  );

  const onMouseDown: PointerEventHandler = useCallback(
    (event) => {
      if (!(event.target instanceof Element) || !isHTMLElement(event.target)) {
        return;
      }

      if (event.target.closest("#PdfHighlighter__tip-container")) {
        return;
      }

      hideTipAndSelection();
    },
    [hideTipAndSelection],
  );

  const attachRef = useCallback(
    (eventBus: EventBus) => {
      unsubscribeRef.current();

      if (containerNodeRef.current) {
        const { ownerDocument: doc } = containerNodeRef.current;
        eventBus.on("textlayerrendered", onTextLayerRendered);
        eventBus.on("pagesinit", onDocumentReady);
        doc.addEventListener("selectionchange", onSelectionChange);
        doc.addEventListener("keydown", handleKeyDown);
        doc.defaultView?.addEventListener("resize", debouncedScaleValue);
        if (resizeObserverRef.current) resizeObserverRef.current.observe(containerNodeRef.current);

        unsubscribeRef.current = () => {
          eventBus.off("pagesinit", onDocumentReady);
          eventBus.off("textlayerrendered", onTextLayerRendered);
          doc.removeEventListener("selectionchange", onSelectionChange);
          doc.removeEventListener("keydown", handleKeyDown);
          doc.defaultView?.removeEventListener("resize", debouncedScaleValue);
          if (resizeObserverRef.current && containerNodeRef.current) {
            resizeObserverRef.current.unobserve(containerNodeRef.current);
          }
        };
      }
    },
    [onTextLayerRendered, onDocumentReady, onSelectionChange, handleKeyDown, debouncedScaleValue],
  );

  const renderHighlightLayer = useCallback(
    (root: Root, pageNumber: number) => {
      const { tip, scrolledToHighlightId } = state;
      root.render(
        <HighlightLayer
          highlightsByPage={groupHighlightsByPage(highlights)}
          pageNumber={pageNumber.toString()}
          scrolledToHighlightId={scrolledToHighlightId}
          highlightTransform={highlightTransform}
          tip={tip}
          scaledPositionToViewport={scaledPositionToViewport}
          hideTipAndSelection={hideTipAndSelection}
          viewer={viewerRef.current}
          screenshot={(position) => screenshot(position, parseInt(pageNumber.toString()))}
          showTip={showTip}
          setTip={(tip) => {
            setState((prevState) => ({ ...prevState, tip }));
          }}
        />,
      );
    },
    [state.tip, state.scrolledToHighlightId, groupHighlightsByPage, highlights, highlightTransform, scaledPositionToViewport, hideTipAndSelection, screenshot, showTip],
  );

  const renderHighlightLayers = useCallback(() => {
    if (!viewerRef.current) return;

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const highlightRoot = highlightRootsRef.current[pageNumber];
      /** Need to check if container is still attached to the DOM as PDF.js can unload pages. */
      if (highlightRoot?.container.isConnected) {
        renderHighlightLayer(highlightRoot.reactRoot, pageNumber);
      } else {
        const highlightLayer = findOrCreateHighlightLayer(pageNumber);
        if (highlightLayer) {
          const reactRoot = createRoot(highlightLayer);
          highlightRootsRef.current[pageNumber] = {
            reactRoot,
            container: highlightLayer,
          };
          renderHighlightLayer(reactRoot, pageNumber);
        }
      }
    }
  }, [pdfDocument, findOrCreateHighlightLayer, renderHighlightLayer]);

  // Initialize PDF viewer
  useEffect(() => {
    const init = async () => {
      const pdfjs = await import("pdfjs-dist/web/pdf_viewer.mjs");

      const eventBus = new pdfjs.EventBus();
      const linkService = new pdfjs.PDFLinkService({
        eventBus,
        externalLinkTarget: 2,
      });

      if (!containerNodeRef.current) {
        throw new Error("Container ref is not available");
      }

      const viewer = new pdfjs.PDFViewer({
        container: containerNodeRef.current,
        eventBus: eventBus,
        textLayerMode: 2,
        removePageBorders: true,
        linkService: linkService,
        ...pdfViewerOptions,
      });

      viewerRef.current = viewer;

      linkService.setDocument(pdfDocument);
      linkService.setViewer(viewer);
      viewer.setDocument(pdfDocument);

      attachRef(eventBus);
    };

    init();

    return () => {
      unsubscribeRef.current();
    };
  }, [pdfDocument, pdfViewerOptions, attachRef]);

  // Update highlights when they change
  useEffect(() => {
    if (viewerRef.current) {
      renderHighlightLayers();
    }
  }, [highlights, renderHighlightLayers]);

  return (
    <div onPointerDown={onMouseDown}>
      <div ref={containerNodeRef} className={styles.container} onContextMenu={(e) => e.preventDefault()}>
        <div className="pdfViewer" />
        {renderTip()}
        {typeof enableAreaSelection === "function" ? (
          <MouseSelection
            onDragStart={() => toggleTextSelection(true)}
            onDragEnd={() => toggleTextSelection(false)}
            onChange={(isVisible) => setState((prev) => ({ ...prev, isAreaSelectionInProgress: isVisible }))}
            shouldStart={(event) => enableAreaSelection(event) && event.target instanceof Element && isHTMLElement(event.target) && Boolean(event.target.closest(".page"))}
            onSelection={(startTarget, boundingRect, resetSelection) => {
              const page = getPageFromElement(startTarget);

              if (!page) {
                return;
              }

              const pageBoundingRect = {
                ...boundingRect,
                top: boundingRect.top - page.node.offsetTop,
                left: boundingRect.left - page.node.offsetLeft,
                pageNumber: page.number,
              };

              const viewportPosition = {
                boundingRect: pageBoundingRect,
                rects: [],
                pageNumber: page.number,
              };

              const scaledPosition = viewportPositionToScaled(viewportPosition);

              const image = screenshot(pageBoundingRect, pageBoundingRect.pageNumber);

              setTip(
                viewportPosition,
                onSelectionFinished(
                  scaledPosition,
                  { image },
                  () => hideTipAndSelection(),
                  () => {
                    setState((prevState) => ({
                      ...prevState,
                      ghostHighlight: {
                        position: scaledPosition,
                        content: { image },
                      },
                    }));

                    // Need to call resetSelection and renderHighlightLayers after state update
                    setTimeout(() => {
                      resetSelection();
                      renderHighlightLayers();
                    }, 0);
                  },
                ),
              );
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

// Set default props to maintain API compatibility
PdfHighlighter.defaultProps = {
  pdfScaleValue: "auto",
};
