"use client";

import { LoadingSpinner } from "@/components/custom-ui/loading-spinner";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AreaHighlight, Highlight, PdfHighlighter as PdfHighlighterComponent, PdfLoader, Popup, Tip } from "react-pdf-highlighter";
import type { Content, IHighlight, NewHighlight, ScaledPosition } from "react-pdf-highlighter";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { Sidebar } from "./Sidebar";
import "react-pdf-highlighter/dist/style.css";
import { FilterControls } from "./FilterControls";
import type { FilterGroup, TextFilter } from "./types";

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
// const PRIMARY_PDF_URL = "/pdf-example/test.pdf";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

export default function PdfHighlighterWrapper() {
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>([]);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    filters: [],
    condition: "AND",
  });
  const [pdfJsDocument, setPdfJsDocument] = useState<any>(null);

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl = url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights([]);
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

  const testFilter = (text: string, filter: TextFilter): boolean => {
    if (!filter.pattern) return false;

    if (filter.isRegex) {
      try {
        const regex = new RegExp(filter.pattern, "i");
        return regex.test(text);
      } catch {
        return false;
      }
    }
    return text.toLowerCase().includes(filter.pattern.toLowerCase());
  };

  const shouldHighlight = (text: string): boolean => {
    if (filterGroup.filters.length === 0) return false;

    return filterGroup.condition === "AND" ? filterGroup.filters.every((filter) => testFilter(text, filter)) : filterGroup.filters.some((filter) => testFilter(text, filter));
  };

  const searchAndHighlight = async () => {
    if (!pdfJsDocument) return;

    // Clear existing highlights
    setHighlights([]);

    const numPages = pdfJsDocument.numPages;
    const newHighlights: NewHighlight[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfJsDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      textContent.items.forEach((item: TextItem) => {
        if (shouldHighlight(item.str)) {
          const transform = item.transform;
          // PDF coordinates start from bottom-left, convert to top-left
          const y = viewport.height - (transform[5] + item.height);

          newHighlights.push({
            content: { text: item.str },
            position: {
              boundingRect: {
                x1: transform[4],
                y1: y,
                x2: transform[4] + item.width,
                y2: y + item.height,
                width: item.width,
                height: item.height,
                pageNumber: pageNum,
              },
              rects: [],
              pageNumber: pageNum,
            },
            comment: { text: "", emoji: "" },
          });
        }
      });
    }

    // Add all highlights at once
    setHighlights(newHighlights.map((h) => ({ ...h, id: getNextId() })));
  };

  // Update highlights when filters change
  useEffect(() => {
    searchAndHighlight();
  }, [filterGroup]);

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <div className="flex flex-col" style={{ width: "25vw" }}>
        <div className="p-4">
          <FilterControls filterGroup={filterGroup} onFilterChange={setFilterGroup} />
        </div>
        <Sidebar highlights={highlights} resetHighlights={resetHighlights} toggleDocument={toggleDocument} />
      </div>
      <div style={{ height: "100vh", width: "75vw", position: "relative" }}>
        <PdfLoader url={url} beforeLoad={<LoadingSpinner />}>
          {(pdfDocument) => {
            // Store pdf.js document for searching
            setPdfJsDocument(pdfDocument);

            return (
              <PdfHighlighterComponent
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
            );
          }}
        </PdfLoader>
      </div>
    </div>
  );
}
