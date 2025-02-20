import { create } from "zustand";
import type { IHighlight } from "react-pdf-highlighter";

export type HighlightCategory = {
  id: string;
  name: string;
  color: string;
};

type HighlightWithCategory = IHighlight & {
  categoryId: string;
};

interface HighlightState {
  categories: HighlightCategory[];
  highlights: HighlightWithCategory[];
  addCategory: (category: Omit<HighlightCategory, "id">) => void;
  removeCategory: (id: string) => void;
  addHighlight: (highlight: Omit<HighlightWithCategory, "id">) => void;
  removeHighlight: (id: string) => void;
  getHighlightsByCategory: (categoryId: string) => HighlightWithCategory[];
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  categories: [],
  highlights: [],

  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, { ...category, id: `cat-${Date.now()}` }],
    })),

  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
      highlights: state.highlights.filter((h) => h.categoryId !== id),
    })),

  addHighlight: (highlight) =>
    set((state) => ({
      highlights: [...state.highlights, { ...highlight, id: `highlight-${Date.now()}` }],
    })),

  removeHighlight: (id) =>
    set((state) => ({
      highlights: state.highlights.filter((h) => h.id !== id),
    })),

  getHighlightsByCategory: (categoryId) => {
    const state = get();
    return state.highlights.filter((h) => h.categoryId === categoryId);
  },
}));
