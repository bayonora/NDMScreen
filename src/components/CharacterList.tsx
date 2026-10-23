import React, { useState } from "react";
import { Copy, Edit2, FileText, Skull, User, UserCheck } from "lucide-react";
import { Character } from "../types";
import { cn, formatMod } from "../lib/utils";
import { HpTracker, InitiativeButton } from "./CharacterControls";
import { copyCharacter } from "../lib/characterClipboard";
import { characterFields } from "../lib/characterSheet";
import { showToast } from "./Toasts";

/*
 * Compact view of Grupo: one row per character with the numbers a DM checks during play
 * (AC, HP, initiative, passive Perception or challenge) and quick actions. The full card opens
 * from the name.
 */

const TYPE_STYLE = {
  player: { title: "text-dm-accent", ring: "border-dm-accent/60", Icon: User },
  npc: { title: "text-slate-400", ring: "border-slate-400/60", Icon: UserCheck },
  creature: { title: "text-dm-danger", ring: "border-dm-danger/60", Icon: Skull },
} as const;

const COLS = "md:grid-cols-[minmax(0,2fr)_3.5rem_minmax(8rem,1.3fr)_3.5rem_5rem_minmax(0,1fr)_7.5rem]";

export function CharacterList({ items, onOpen, onEdit }: {
  items: Character[];
  onOpen: (c: Character) => void;
  onEdit: (c: Character) => void;
}) {
  if (!items.length) return null;
  const isPlayers = items[0].type === "player";
  return (
    <div className="border border-dm-border rounded-sm bg-dm-bg divide-y divide-dm-border/70">
      <div className={cn("hidden md:grid gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-dm-muted font-sans", COLS)}>
        <span>Nombre</span>
        <span className="text-center">CA</span>
        <span>PV</span>
        <span className="text-center">Inic.</span>
        <span className="text-center">{isPlayers ? "Pasiva" : "Desafío"}</span>
        <span>Etiquetas</span>
        <span aria-hidden />
      </div>
      {items.map((c) => <Row key={c.id} character={c} onOpen={onOpen} onEdit={onEdit} />)}
    </div>
  );
}

function Row({ character: c, onOpen, onEdit }: { character: Character; onOpen: (c: Character) => void; onEdit: (c: Character) => void }) {
  const [pop, setPop] = useState<"hp" | "init" | null>(null);
  const style = TYPE_STYLE[c.type];
  const { fields } = characterFields(c);
  const subtitle = c.type === "player" ? [c.race, c.classAndLevel].filter(Boolean).join(" · ") : c.race;
  const third = c.type === "player" ? (c.passivePerception || "—") : (c.cr || "—");

  const copy = async () => {
    const ok = await copyCharacter(c);
    showToast(ok ? `Ficha de ${c.name} copiada. Pégala en Google Docs, Word…` : "No se pudo copiar la ficha.");
  };

  return (
    <div
      data-search-id={c.id}
      className={cn("relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-center px-3 py-2.5 hover:bg-dm-bg-hover/60 transition-colors", COLS, pop && "z-20")}
    >
      {/* Name: opens the full card. */}
      <button type="button" onClick={() => onOpen(c)} className="flex items-center gap-2.5 min-w-0 text-left group" title="Ver ficha">
        {c.image ? (
          <img src={c.image} alt="" className={cn("w-8 h-8 rounded-full object-cover border shrink-0", style.ring)} />
        ) : (
          <span className={cn("w-8 h-8 rounded-full border flex items-center justify-center shrink-0 bg-dm-bg-hover", style.ring)}>
            <style.Icon size={15} className={style.title} />
          </span>
        )}
        <span className="min-w-0">
          <span className={cn("block font-sans font-bold truncate group-hover:underline underline-offset-2", style.title)}>{c.name}</span>
          {subtitle && <span className="block text-xs italic text-dm-muted truncate">{subtitle}</span>}
        </span>
      </button>

      {/* On phones these numbers go in a line under the name. */}
      <span className="hidden md:block text-center font-bold tabular-nums text-dm-text-bright" title={fields.acDesc ? `CA ${c.ac} (${fields.acDesc})` : "Clase de Armadura"}>{c.ac}</span>
      <div className="col-span-2 md:col-span-1 row-start-2 md:row-start-auto min-w-0">
        <div className="flex items-center gap-3">
          <span className="md:hidden text-xs font-sans text-dm-muted whitespace-nowrap">
            CA <b className="text-dm-text-bright">{c.ac}</b> · Inic. <b className="text-dm-text-bright">{formatMod(c.stats.DEX)}</b> · {c.type === "player" ? "Pas." : "VD"} <b className="text-dm-text-bright">{third}</b>
          </span>
          <div className="flex-1 min-w-0">
            <HpTracker character={c} compact open={pop === "hp"} onOpenChange={(v) => setPop(v ? "hp" : null)} />
          </div>
        </div>
      </div>
      <span className="hidden md:block text-center font-bold tabular-nums text-dm-text-bright">{formatMod(c.stats.DEX)}</span>
      <span className="hidden md:block text-center tabular-nums text-dm-text truncate" title={String(third)}>{third}</span>
      <div className="hidden md:flex flex-wrap gap-1 min-w-0">
        {(c.tags || []).map((t) => (
          <span key={t.id} title={t.description || t.name} className="px-1.5 py-0.5 text-[11px] font-sans rounded-sm border border-dm-accent/50 text-dm-accent truncate max-w-full">{t.name}</span>
        ))}
      </div>

      <div className="flex items-center justify-end -mr-1.5 row-start-1 col-start-2 md:row-start-auto md:col-start-auto">
        <InitiativeButton character={c} open={pop === "init"} onOpenChange={(v) => setPop(v ? "init" : null)} />
        <RowAction label="Copiar ficha" onClick={copy}><Copy size={16} /></RowAction>
        <RowAction label="Editar" onClick={() => onEdit(c)} className="hidden sm:block"><Edit2 size={16} /></RowAction>
        <RowAction label="Ver ficha" onClick={() => onOpen(c)}><FileText size={16} /></RowAction>
      </div>
    </div>
  );
}

function RowAction({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cn("p-2.5 sm:p-1.5 rounded-sm text-dm-muted hover:text-dm-accent transition-colors", className)}>
      {children}
    </button>
  );
}
