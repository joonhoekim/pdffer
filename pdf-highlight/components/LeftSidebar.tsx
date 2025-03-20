"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export const LeftSidebar: React.FC = () => {
  return (
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
          <div className="space-y-2">
            <p className="text-sm">No notes yet.</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
