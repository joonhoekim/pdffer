"use client";

import React, { useState } from "react";
import { FileText, MoreHorizontal, Search, Plus, Clock, Star, Trash2, Folder, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PdfUploader } from "./PdfUploader";

export function PdfLibrary({ files = [], currentFileId, onFileSelect, onFileUpload }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // 검색 필터링
  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // 파일 업로드 처리
  const handleFileUploaded = (fileData) => {
    onFileUpload(fileData);
    setUploadDialogOpen(false);
  };

  // 시간 포맷팅 함수
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* 검색 및 업로드 버튼 */}
      <div className="p-4 pb-2 space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search PDFs..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload PDF</DialogTitle>
                <DialogDescription>Upload a new PDF file to your library.</DialogDescription>
              </DialogHeader>
              <PdfUploader onFileUploaded={handleFileUploaded} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All Files
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1">
              Recent
            </TabsTrigger>
            <TabsTrigger value="starred" className="flex-1">
              Starred
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 pt-2">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="px-4">
              {filteredFiles.length > 0 ? (
                <div className="space-y-1">
                  {filteredFiles.map((file) => (
                    <Button key={file.id} variant={currentFileId === file.id ? "secondary" : "ghost"} className="w-full justify-start text-left h-auto py-3" onClick={() => onFileSelect(file)}>
                      <div className="flex items-start gap-3 w-full">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="grid gap-0.5 flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(file.lastModified)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Star className="mr-2 h-4 w-4" /> Star
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Folder className="mr-2 h-4 w-4" /> Move to folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{searchQuery ? "No PDF files found" : "Your PDF library is empty"}</p>
                  {!searchQuery && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Upload PDF
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recent" className="flex-1">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              Recently viewed PDFs will appear here
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="starred" className="flex-1">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2" />
              Starred PDFs will appear here
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{files.length} files</span>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <ArrowUpDown className="h-3 w-3" />
            <span>Sort</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
