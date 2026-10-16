import { create } from "zustand";
import { Spell } from "../types/spell";

interface SpellStore {
  spells: Spell[];
  isLoading: boolean;
  error: string | null;
  fetchSpells: () => Promise<void>;
}

// The SRD spell list is large (~700 KB), so it is code-split and loaded on first use.
export const useSpellStore = create<SpellStore>((set, get) => ({
  spells: [],
  isLoading: false,
  error: null,
  fetchSpells: async () => {
    if (get().spells.length > 0 || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { default: data } = await import("../data/5e-SRD-Spells.json");
      set({ spells: data as Spell[], isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
