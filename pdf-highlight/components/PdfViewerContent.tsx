"use client";

import React from "react";
import { PdfHighlighter, PdfLoader, Popup, Tip, AreaHighlight, Highlight } from "..";
import { Spinner } from "../Spinner";
import { usePdfViewerStore } from "../store/pdfViewerStore";
import { usePdfViewer } from "../hooks/usePdfViewer";
import type { ExtendedPDFViewerOptions } from "../types";

// Highlight popup component to show comment text and emoji
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

export const PdfViewerContent: React.FC = () => {
  const { url, highlights, scaleMode, currentScale, spreadMode, addHighlight, updateHighlight } = usePdfViewerStore();

  const { resetHash, onViewerLoaded, scrollViewerTo, scrollToHighlightFromHash } = usePdfViewer();

  // Create PDF viewer options object
  const pdfViewerOptions: Partial<ExtendedPDFViewerOptions> = {
    spreadMode,
    scaleMode,
    defaultScale: currentScale,
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* PDF viewer container - position: relative for PDF.js container parent role */}
      <div className="absolute inset-0">
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <div className="relative w-full h-full">
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey} // Alt key enables area selection
                onScrollChange={resetHash}
                scrollRef={(scrollTo) => {
                  scrollViewerTo.current = scrollTo;
                  scrollToHighlightFromHash();
                }}
                onViewerLoaded={onViewerLoaded}
                pdfViewerOptions={pdfViewerOptions}
                // Text selection complete handler - shows tip for comment entry
                onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      addHighlight({ content, position, comment });
                      hideTipAndSelection();
                    }}
                  />
                )}
                // Highlight transform handler - renders the proper highlight component
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
  );
};
