import React from "react";
import { Markdown } from "./ui/Markdown";
import { Measured } from "./ui/Measured";
import { formatMod } from "../lib/utils";
import { Monster, MonsterEntry } from "../types/monster";
import { formatXP, monsterSubtitle } from "../data/monsterLabels";

const ABILITIES: { key: keyof Monster["stats"]; label: string }[] = [
  { key: "STR", label: "FUE" },
  { key: "DEX", label: "DES" },
  { key: "CON", label: "CON" },
  { key: "INT", label: "INT" },
  { key: "WIS", label: "SAB" },
  { key: "CHA", label: "CAR" },
];

const proseClass = "prose prose-invert prose-sm max-w-none text-dm-text leading-relaxed prose-p:my-0 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-dm-text-bright prose-em:text-dm-text-muted";

/** Full 5e stat block for a bestiary entry, in the app's theme colors. */
export function MonsterStatBlock({ monster: m, showLore = true }: { monster: Monster; showLore?: boolean }) {
  return (
    <div className="text-sm text-dm-text space-y-3">
      <p className="italic text-dm-muted">{monsterSubtitle(m)}</p>

      {showLore && m.desc && (
        <div className={`${proseClass} text-dm-text-muted border-l-2 border-dm-accent/40 pl-3`}>
          <Markdown units>{m.desc}</Markdown>
        </div>
      )}

      <Divider />
      <div className="space-y-1">
        <Property label="Clase de Armadura">{m.ac}{m.ac_desc ? ` (${m.ac_desc})` : ""}</Property>
        <Property label="Puntos de golpe">{m.hp}{m.hit_dice ? ` (${m.hit_dice})` : ""}</Property>
        <Property label="Velocidad"><Measured text={m.speed} /></Property>
      </div>

      <Divider />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
        {ABILITIES.map(({ key, label }) => (
          <div key={key} className="bg-dm-bg-hover border border-dm-border rounded-sm py-1.5">
            <div className="text-[10px] font-bold tracking-widest text-dm-accent">{label}</div>
            <div className="text-dm-text-bright tabular-nums">
              {m.stats[key]} <span className="text-dm-muted">({formatMod(m.stats[key])})</span>
            </div>
          </div>
        ))}
      </div>

      <Divider />
      <div className="space-y-1">
        <Property label="Tiradas de salvación">{m.saving_throws}</Property>
        <Property label="Habilidades">{m.skills}</Property>
        <Property label="Vulnerabilidades al daño">{m.damage_vulnerabilities}</Property>
        <Property label="Resistencias al daño">{m.damage_resistances}</Property>
        <Property label="Inmunidades al daño">{m.damage_immunities}</Property>
        <Property label="Inmunidades a estados">{m.condition_immunities}</Property>
        <Property label="Sentidos">{m.senses && <Measured text={m.senses} />}</Property>
        <Property label="Idiomas">{m.languages && <Measured text={m.languages} />}</Property>
        <Property label="Desafío">{m.cr}{m.xp !== undefined ? ` (${formatXP(m.xp)})` : ""}</Property>
      </div>

      {m.traits && m.traits.length > 0 && (
        <>
          <Divider />
          <Entries entries={m.traits} />
        </>
      )}

      <Section title="Acciones" entries={m.actions} />
      <Section title="Reacciones" entries={m.reactions} />
      <Section title="Acciones legendarias" entries={m.legendary_actions} intro={m.legendary_desc} />

      {m.notes?.map((n) => (
        <div key={n.name} className="mt-4 p-3 bg-dm-bg-hover border border-dm-border rounded-sm">
          <h3 className="text-xs uppercase tracking-widest font-bold text-dm-accent mb-2">{n.name}</h3>
          <div className={`${proseClass} [&_p+p]:mt-2`}>
            <Markdown units>{n.desc}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-dm-accent/60 via-dm-accent/20 to-transparent" />;
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === undefined || children === "" || children === null) return null;
  return (
    <div>
      <strong className="text-dm-accent font-semibold">{label}</strong> {children}
    </div>
  );
}

function Section({ title, entries, intro }: { title: string; entries?: MonsterEntry[]; intro?: string }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="pt-2">
      <h3 className="text-base font-display uppercase tracking-widest text-dm-accent border-b border-dm-accent/40 pb-1 mb-2">{title}</h3>
      {intro && (
        <div className={`${proseClass} mb-2`}>
          <Markdown units>{intro}</Markdown>
        </div>
      )}
      <Entries entries={entries} />
    </div>
  );
}

function Entries({ entries }: { entries: MonsterEntry[] }) {
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={`${e.name}-${i}`} className={proseClass}>
          <Markdown units>{`***${e.name}.*** ${e.desc}`}</Markdown>
        </div>
      ))}
    </div>
  );
}
