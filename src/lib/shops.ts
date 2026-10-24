import { useEffect, useMemo, useSyncExternalStore, type ElementType } from "react";
import { Backpack, Hammer, FlaskConical, Store } from "lucide-react";
import type { Shop } from "../types";
import { useStore } from "../store/useStore";

/**
 * Fixed shops ("tiendas base"): they ship with the app (src/data/defaultShops.json, built by
 * scripts/tiendas/build_shops.mjs), are never saved or exported, and can't be edited or deleted,
 * only duplicated. They always come first in the grid, before the user's shops, and can be hidden.
 */
export const isBuiltinShop = (id: string) => id.startsWith("builtin-");

/** Kind of shop: label and icon of the card. Copies of a fixed shop keep it. */
export const SHOP_KINDS: Record<string, { label: string; icon: ElementType }> = {
  general: { label: "Tienda general", icon: Backpack },
  forge: { label: "Herrería", icon: Hammer },
  potions: { label: "Alquimista", icon: FlaskConical },
};

export const shopIcon = (shop: Shop) => (shop.kind && SHOP_KINDS[shop.kind]?.icon) || Store;

// The JSON (~120 KB) is loaded the first time someone needs it, so it stays out of the main bundle.
let builtinShops: Shop[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const EMPTY: Shop[] = [];

function loadBuiltinShops() {
  if (builtinShops || loading) return;
  loading = import("../data/defaultShops.json").then((m) => {
    builtinShops = m.default as Shop[];
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBuiltinShops(): Shop[] {
  useEffect(loadBuiltinShops, []);
  return useSyncExternalStore(subscribe, () => builtinShops) || EMPTY;
}

/** Every shop in display order. `all` keeps the fixed shops even when they're hidden. */
export function useShops() {
  const user = useStore((s) => s.shops);
  const hideBuiltin = !!useStore((s) => s.uiState.hideBuiltinShops);
  const hiddenItems = useStore((s) => s.uiState.hiddenBuiltinItems);
  const loaded = useBuiltinShops();
  // The fixed shops can't change, so the items the DM hides in them are kept apart (by id).
  const builtins = useMemo(() => {
    if (!hiddenItems?.length) return loaded;
    const hidden = new Set(hiddenItems);
    return loaded.map((s) => (s.items.some((it) => hidden.has(it.id)) ? { ...s, items: s.items.map((it) => ({ ...it, hidden: hidden.has(it.id) })) } : s));
  }, [loaded, hiddenItems]);
  return useMemo(() => {
    const all = [...builtins, ...(user || [])];
    return { all, visible: hideBuiltin ? user || [] : all, hideBuiltin };
  }, [user, builtins, hideBuiltin]);
}
