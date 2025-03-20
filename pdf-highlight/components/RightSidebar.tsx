"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { usePdfViewerStore } from "../store/pdfViewerStore";
import type { IHighlight } from "../types";

export const RightSidebar: React.FC = () => {
  const { highlights, resetHighlights, toggleDocument } = usePdfViewerStore();

  const highlightsByPage = highlights.reduce<Record<number, IHighlight[]>>((acc, highlight) => {
    const pageNumber = highlight.position.pageNumber;
    if (!acc[pageNumber]) {
      acc[pageNumber] = [];
    }
    acc[pageNumber].push(highlight);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-auto">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Highlights</h3>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={resetHighlights}>
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={toggleDocument}>
                Toggle Document
              </Button>
            </div>
          </div>

          {Object.keys(highlightsByPage).map((pageNumber) => (
            <React.Fragment key={pageNumber}>
              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2">Page {pageNumber}</h4>
                {highlightsByPage[Number(pageNumber)].map((highlight) => (
                  <div
                    key={highlight.id}
                    className="p-2 border rounded mb-2 hover:bg-muted cursor-pointer"
                    onClick={() => {
                      document.location.hash = `highlight-${highlight.id}`;
                    }}>
                    <div className="text-sm">
                      {highlight.content.text ? <div className="line-clamp-2">{highlight.content.text}</div> : <div className="italic text-muted-foreground">Image highlight</div>}
                    </div>
                    {highlight.comment && highlight.comment.text && (
                      <div className="mt-1 text-xs text-muted-foreground flex items-center">
                        <span>{highlight.comment.emoji}</span>
                        <span className="ml-1">{highlight.comment.text}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}

          {highlights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No highlights yet.</p>
              <p className="text-xs mt-1">Select text to create highlights.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
