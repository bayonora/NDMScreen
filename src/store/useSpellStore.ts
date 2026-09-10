import { create } from "zustand";
import { Spell } from "../types/spell";
import spellData from "../data/5e-SRD-Spells.json";

interface SpellStore {
  spells: Spell[];
  isLoading: boolean;
  error: string | null;
  fetchSpells: () => Promise<void>;
}

export const useSpellStore = create<SpellStore>((set) => ({
  spells: spellData as Spell[],
  isLoading: false,
  error: null,
  fetchSpells: async () => {
    set({ spells: spellData as Spell[], isLoading: false });
  },
}));
