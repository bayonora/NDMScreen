import { create } from "zustand";
import { Monster } from "../types/monster";

interface MonsterStore {
  monsters: Monster[];
  isLoading: boolean;
  error: string | null;
  fetchMonsters: () => Promise<void>;
}

// The bestiary (~600 KB) is code-split like the spell list and loaded on first use.
export const useMonsterStore = create<MonsterStore>((set, get) => ({
  monsters: [],
  isLoading: false,
  error: null,
  fetchMonsters: async () => {
    if (get().monsters.length > 0 || get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { default: data } = await import("../data/5e-SRD-Monsters.json");
      set({ monsters: data as Monster[], isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
