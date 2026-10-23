import { create } from "zustand";
import { CatalogItem } from "../types/item";

interface ItemCatalogStore {
  items: CatalogItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
}

// The SRD item catalog (~370 KB) is code-split like the spell list and loaded on first use.
export const useItemCatalogStore = create<ItemCatalogStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  fetchItems: async () => {
    if (get().items.length > 0 || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { default: data } = await import("../data/5e-SRD-Items.json");
      set({ items: data as CatalogItem[], isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
