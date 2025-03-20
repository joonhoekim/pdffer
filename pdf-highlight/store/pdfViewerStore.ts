import { create } from "zustand";
import type { IHighlight, NewHighlight, ScaledPosition, Content, PDFScaleMode, PDFSpreadMode } from "../types";

interface PdfViewerState {
  // PDF document state
  url: string;
  setUrl: (url: string) => void;
  toggleDocument: () => void;

  // Highlights
  highlights: IHighlight[];
  addHighlight: (highlight: NewHighlight) => void;
  updateHighlight: (highlightId: string, position: Partial<ScaledPosition>, content: Partial<Content>) => void;
  resetHighlights: () => void;

  // UI state
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;

  // Viewer settings
  scaleMode: PDFScaleMode;
  currentScale: number;
  spreadMode: PDFSpreadMode;
  setScaleMode: (mode: PDFScaleMode) => void;
  setCurrentScale: (scale: number) => void;
  setSpreadMode: (mode: PDFSpreadMode) => void;

  // Helper functions
  getHighlightById: (id: string) => IHighlight | undefined;

  // Extra data
  testHighlights: Record<string, Array<IHighlight>>;
  setTestHighlights: (highlights: Record<string, Array<IHighlight>>) => void;
}

// Constants
const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

// Helper function to generate a random ID
const getNextId = () => String(Math.random()).slice(2);

export const usePdfViewerStore = create<PdfViewerState>((set, get) => ({
  // Initial state for PDF document
  url: (typeof window !== "undefined" && new URLSearchParams(document.location.search).get("url")) || PRIMARY_PDF_URL,
  setUrl: (url) => set({ url }),

  // Initial state for highlights
  highlights: [],
  addHighlight: (highlight) => {
    const newHighlight = { ...highlight, id: getNextId() };
    set((state) => ({
      highlights: [newHighlight, ...state.highlights],
    }));

    // Return the new highlight ID for any follow-up actions
    return newHighlight.id;
  },
  updateHighlight: (highlightId, position, content) => {
    set((state) => ({
      highlights: state.highlights.map((h) => {
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
    }));
  },
  resetHighlights: () => set({ highlights: [] }),

  // Initial UI state
  showLeftSidebar: true,
  showRightSidebar: true,
  toggleLeftSidebar: () => set((state) => ({ showLeftSidebar: !state.showLeftSidebar })),
  toggleRightSidebar: () => set((state) => ({ showRightSidebar: !state.showRightSidebar })),

  // Initial viewer settings
  scaleMode: "auto" as PDFScaleMode,
  currentScale: 1,
  spreadMode: 0 as PDFSpreadMode,
  setScaleMode: (mode) => set({ scaleMode: mode }),
  setCurrentScale: (scale) => set({ currentScale: scale }),
  setSpreadMode: (mode) => set({ spreadMode: mode }),

  // Helper functions
  getHighlightById: (id) => {
    return get().highlights.find((highlight) => highlight.id === id);
  },

  // Extra data for test highlights
  testHighlights: {},
  setTestHighlights: (highlights) =>
    set({
      testHighlights: highlights,
      highlights: highlights[get().url] ? [...highlights[get().url]] : [],
    }),

  // Document toggle function
  toggleDocument: () => {
    const currentUrl = get().url;
    const newUrl = currentUrl === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    const testHighlights = get().testHighlights;

    set({
      url: newUrl,
      highlights: testHighlights[newUrl] ? [...testHighlights[newUrl]] : [],
    });
  },
}));
