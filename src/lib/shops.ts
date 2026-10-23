import { useEffect, useMemo, useSyncExternalStore, type ElementType } from "react";
import { Backpack, Hammer, FlaskConical, Beer, Store } from "lucide-react";
import type { Shop } from "../types";
import { useStore } from "../store/useStore";

/**
 * Fixed shops ("tiendas base"): they ship with the app (src/data/defaultShops.json, built by
 * scripts/tiendas/build_shops.mjs), are never saved or exported, and can't be edited or deleted,
 * only duplicated. They sit in the grid among the user's shops and can be hidden.
 */
export const isBuiltinShop = (id: string) => id.startsWith("builtin-");

/** Kind of shop: label and icon of the card. Copies of a fixed shop keep it. */
export const SHOP_KINDS: Record<string, { label: string; icon: ElementType }> = {
  general: { label: "Tienda general", icon: Backpack },
  forge: { label: "Herrería", icon: Hammer },
  potions: { label: "Alquimista", icon: FlaskConical },
  tavern: { label: "Posada", icon: Beer },
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

/**
 * The user's shops and the fixed ones in display order. `order` lists ids as the user last sorted
 * them; a shop missing from it goes after the user shop that precedes it in `user` (so a new shop
 * lands next to the others, not after the fixed ones), and missing fixed shops go at the end.
 */
export function mergeShops(user: Shop[], builtins: Shop[], order?: string[]): Shop[] {
  if (!order?.length) return [...user, ...builtins];
  const byId = new Map([...user, ...builtins].map((s) => [s.id, s]));
  const list = order.map((id) => byId.get(id)).filter((s): s is Shop => !!s);
  const placed = new Set(list.map((s) => s.id));
  user.forEach((shop, i) => {
    if (placed.has(shop.id)) return;
    let at = -1;
    for (let j = i - 1; j >= 0 && at < 0; j--) at = list.findIndex((s) => s.id === user[j].id);
    if (at < 0) at = Math.max(0, list.findIndex((s) => !isBuiltinShop(s.id))) - 1;
    list.splice(at + 1, 0, shop);
    placed.add(shop.id);
  });
  builtins.forEach((s) => !placed.has(s.id) && list.push(s));
  return list;
}

/** Every shop in display order. `all` keeps the fixed shops even when they're hidden. */
export function useShops() {
  const user = useStore((s) => s.shops);
  const order = useStore((s) => s.uiState.shopOrder);
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
    const all = mergeShops(user || [], builtins, order);
    return { all, visible: hideBuiltin ? all.filter((s) => !isBuiltinShop(s.id)) : all, hideBuiltin };
  }, [user, builtins, order, hideBuiltin]);
}
