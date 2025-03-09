"use client";

import type { IHighlight } from "./index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  toggleDocument: () => void;
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};

export function Sidebar({ highlights, toggleDocument, resetHighlights }: Props) {
  return (
    <div className="h-full overflow-hidden bg-background text-foreground border-r">
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Alt 키 누르고 드래그 : 영역 하이라이트 </span>
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-1">
          {highlights.map((highlight) => (
            <Card key={highlight.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b rounded-none" onClick={() => updateHash(highlight)}>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Badge variant="outline" className="text-xs">
                    Page {highlight.position.pageNumber}
                  </Badge>
                </div>
                <p className="font-medium">{highlight.comment.text}</p>
                {highlight.content.text && (
                  <blockquote className="text-sm text-muted-foreground mt-2 italic pl-3 border-l-2 border-muted">{`${highlight.content.text.slice(0, 90).trim()}…`}</blockquote>
                )}

                {highlight.content.image && (
                  <div className="mt-2 max-w-[300px] overflow-auto border border-dashed border-muted p-1">
                    <img src={highlight.content.image} alt="Screenshot" className="max-w-full" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 space-y-2">
        <Button variant="outline" className="w-full" onClick={toggleDocument}>
          Toggle PDF document
        </Button>

        {highlights.length > 0 && (
          <Button variant="destructive" className="w-full" onClick={resetHighlights}>
            Reset highlights
          </Button>
        )}
      </div>
    </div>
  );
}
