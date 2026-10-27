import React from "react";
import { Link2 } from "lucide-react";
import { ColorPicker } from "./ui/ColorPicker";
import { Chip, RarityDot } from "./ui/Chip";
import { Select, type SelectOption } from "./ui/Select";
import { cn } from "../lib/utils";
import { ITEM_GROUPS, ITEM_TYPES, RARITIES, itemTypeInfo, homebrewTypeKey, homebrewRarityKey, rarityInfo } from "../data/itemLabels";
import type { CustomItem } from "../types";

const labelClass = "block text-xs uppercase tracking-widest text-dm-muted mb-1";
const fieldClass = "w-full bg-black/40 border border-dm-border p-2 text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none";

type Draft = Omit<CustomItem, "id"> & { id?: string };

const ATTUNE = /^requiere sintonizaci[oó]n\s*/i;

const TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Sin tipo" },
  ...ITEM_GROUPS.flatMap((g) => ITEM_TYPES.filter((t) => t.group === g.key).map((t) => ({ value: t.key, label: t.label, group: g.label }))),
];

/**
 * Structured fields of a homebrew item: type, rarity, attunement and the stats that fit the type.
 * Type and rarity are keys shared with the SRD catalog, so the item filters like any catalog item
 * (loot tables, homebrew list); their display text (`category`, `rarity`) is kept in sync.
 */
export function HomebrewItemFields({ item, onChange }: { item: Draft; onChange: (item: Draft) => void }) {
  const type = homebrewTypeKey(item) ?? "";
  const rarityKey = homebrewRarityKey(item);
  const typeInfo = itemTypeInfo(type);
  const group = typeInfo?.group;
  // The text shown on the card, when it says more than the type ("Arma (cualquier espada)").
  const customLabel = item.category && item.category !== typeInfo?.label ? item.category : "";
  const set = (patch: Partial<Draft>) => onChange({ ...item, ...patch });

  const pickType = (key: string) => set({ type: key || undefined, category: itemTypeInfo(key)?.label ?? "" });
  const pickRarity = (key: string | undefined) => {
    const r = rarityInfo(key);
    // A rarity paints the card with its color; "no rarity" leaves the color as it was.
    set({ rarityKey: key, rarity: r?.label ?? "", ...(r ? { color: r.color } : {}) });
  };

  const attuned = !!item.attunement?.trim();
  const attuneDetail = (item.attunement || "").replace(ATTUNE, "");

  const showWeapon = !group || group === "weapons" || !!item.damage || !!item.properties;
  const showArmor = !group || group === "armor" || !!item.armorClass;

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1 mb-4">
        <div>
          <label className={labelClass} htmlFor="item-type">Tipo</label>
          <Select id="item-type" value={type} onChange={pickType} options={TYPE_OPTIONS} dimEmpty className="h-auto py-2 bg-black/40" />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-category">Texto del tipo <span className="normal-case tracking-normal text-dm-muted-alt">(opcional)</span></label>
          <input
            id="item-category"
            value={customLabel}
            onChange={(e) => set({ category: e.target.value || typeInfo?.label || "" })}
            placeholder="Ej. Arma (cualquier espada)"
            className={cn(fieldClass, "text-sm")}
          />
        </div>
      </div>

      <span className={labelClass}>Rareza</span>
      <div className="flex flex-wrap gap-1.5 mb-1.5" role="radiogroup" aria-label="Rareza">
        <Chip active={!rarityKey} onClick={() => pickRarity(undefined)} className="py-1">
          <RarityDot /> Sin rareza
        </Chip>
        {RARITIES.map((r) => (
          <Chip key={r.key} active={rarityKey === r.key} color={r.color} onClick={() => pickRarity(r.key)} className="py-1">
            <RarityDot color={r.color} active={rarityKey === r.key} /> {r.label}
          </Chip>
        ))}
      </div>
      <p className="text-[11px] text-dm-muted mb-4">
        Equipo normal = sin rareza. La rareza decide el filtro en las tablas de botín y pinta la tarjeta.
        {item.rarity && rarityKey && item.rarity !== rarityInfo(rarityKey)?.label && <> Se muestra como «{item.rarity}».</>}
      </p>

      <span className={labelClass}>Color de la tarjeta</span>
      <ColorPicker value={item.color} onChange={(color) => set({ color })} />

      {(rarityKey || attuned) && (
        <div className="mb-4 border border-dm-border bg-dm-bg-darker/40 p-3">
          <label className="flex items-center gap-2 text-sm text-dm-text cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attuned}
              onChange={(e) => set({ attunement: e.target.checked ? "requiere sintonización" : "" })}
              className="accent-[var(--theme-accent)] w-4 h-4"
            />
            <Link2 size={14} className="text-dm-muted" /> Requiere sintonización
          </label>
          {attuned && (
            <input
              value={attuneDetail}
              onChange={(e) => set({ attunement: `requiere sintonización${e.target.value.trim() ? ` ${e.target.value.trimStart()}` : ""}` })}
              aria-label="Restricción de sintonización"
              placeholder="por un lanzador de conjuros, por un paladín… (opcional)"
              className={cn(fieldClass, "text-sm mt-2")}
            />
          )}
        </div>
      )}

      <fieldset className="border border-dm-border p-3 pb-0 mb-4">
        <legend className="px-1 text-xs uppercase tracking-widest text-dm-muted">Detalles (opcionales)</legend>
        <div className="grid grid-cols-2 gap-x-3">
          <div>
            <label className={labelClass} htmlFor="item-value">Valor</label>
            <input id="item-value" type="text" value={item.value || ""} onChange={(e) => set({ value: e.target.value })} className={cn(fieldClass, "mb-4")} placeholder="Ej. 500 po" />
          </div>
          <div>
            <label className={labelClass} htmlFor="item-weight">Peso</label>
            <input id="item-weight" type="text" value={item.weight || ""} onChange={(e) => set({ weight: e.target.value })} className={cn(fieldClass, "mb-4")} placeholder="Ej. 3 lb" />
          </div>
          {showWeapon && (
            <>
              <div className={showArmor ? "" : "col-span-2"}>
                <label className={labelClass} htmlFor="item-damage">Daño</label>
                <input id="item-damage" type="text" value={item.damage || ""} onChange={(e) => set({ damage: e.target.value })} className={cn(fieldClass, "mb-4")} placeholder="Ej. 1d8 cortante" />
              </div>
            </>
          )}
          {showArmor && (
            <div className={showWeapon ? "" : "col-span-2"}>
              <label className={labelClass} htmlFor="item-ac">Clase de Armadura</label>
              <input id="item-ac" type="text" value={item.armorClass || ""} onChange={(e) => set({ armorClass: e.target.value })} className={cn(fieldClass, "mb-4")} placeholder="Ej. 14 + Des (máx. 2)" />
            </div>
          )}
          {showWeapon && (
            <div className="col-span-2">
              <label className={labelClass} htmlFor="item-properties">Propiedades</label>
              <input id="item-properties" type="text" value={item.properties || ""} onChange={(e) => set({ properties: e.target.value })} className={cn(fieldClass, "mb-4")} placeholder="Ej. Sutil, ligera" />
            </div>
          )}
        </div>
      </fieldset>
    </>
  );
}

/** What gets saved: the structured type and rarity (guessed ones included) next to their texts. */
export function withStructuredFields<T extends Draft>(item: T): T {
  const type = homebrewTypeKey(item);
  const rarityKey = homebrewRarityKey(item);
  return {
    ...item,
    type,
    category: item.category?.trim() || itemTypeInfo(type)?.label || "",
    rarityKey,
    rarity: rarityKey ? item.rarity?.trim() || rarityInfo(rarityKey)?.label || "" : "",
  };
}
