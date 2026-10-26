import type { ShopItem } from "../types";

/** Category of a shop item; "" when it has none. */
export const shopCategory = (item: Pick<ShopItem, "category">) => item.category?.trim() || "";

export type ShopItemGroup = { category: string; items: ShopItem[] };

/** Items by category, in the order each category first shows up (that order is the shop's). */
export function groupShopItems(items: ShopItem[]): ShopItemGroup[] {
  const groups = new Map<string, ShopItem[]>();
  for (const it of items) {
    const key = shopCategory(it);
    const list = groups.get(key);
    if (list) list.push(it);
    else groups.set(key, [it]);
  }
  return [...groups].map(([category, list]) => ({ category, items: list }));
}

/** Every distinct category, in shop order, without the empty one. */
export const shopCategories = (items: ShopItem[]) => groupShopItems(items).map((g) => g.category).filter(Boolean);

/** Puts the item (new or moved) at the end of its category, or at the very end if the category is new. */
export function placeInCategory(items: ShopItem[], item: ShopItem): ShopItem[] {
  const rest = items.filter((i) => i.id !== item.id);
  const key = shopCategory(item);
  let at = -1;
  rest.forEach((i, idx) => { if (shopCategory(i) === key) at = idx; });
  if (at < 0) return [...rest, item];
  return [...rest.slice(0, at + 1), item, ...rest.slice(at + 1)];
}
