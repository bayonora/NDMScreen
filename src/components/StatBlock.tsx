import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, actions } from "../store/useStore";
import { Modal } from "./ui/Modal";
import { Lightbox } from "./ui/Lightbox";
import { Input, Button, Textarea } from "./ui/Input";
import { Measured } from "./ui/Measured";
import {
  Plus, Skull, Swords, UserCheck, User, ChevronDown, Copy, Check, Edit2, Trash2, MoreVertical, CopyPlus,
  Shield, Heart, Eye, Zap, Gauge,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Character, CharacterTag } from "../types";
import { cn, formatMod } from "../lib/utils";
import { readCharacterSheet, SheetBlock, PROP_LABELS } from "../lib/characterSheet";
import { copyCharacter } from "../lib/characterClipboard";
import { HpTracker, InitiativeButton, Popover } from "./CharacterControls";
import { showToast } from "./Toasts";

interface StatBlockProps {
  character: Character;
  onEdit?: (c: Character) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (c: Character) => void;
  onConvertToCreature?: (c: Character) => void;
  onConvertToNPC?: (c: Character) => void;
  /** Always shows the whole card, without the collapse control (search preview, initiative...). */
  hideCollapse?: boolean;
}

const TYPE_STYLE = {
  player: { border: "border-l-dm-accent", title: "text-dm-accent", ring: "border-dm-accent/60", Icon: User },
  npc: { border: "border-l-slate-400", title: "text-slate-400", ring: "border-slate-400/60", Icon: UserCheck },
  creature: { border: "border-l-dm-danger", title: "text-dm-danger", ring: "border-dm-danger/60", Icon: Skull },
} as const;

/** `narrowOnly`: shown inline on wide cards, so the menu only lists it on narrow ones. */
type MenuItem = { label: string; icon: React.ElementType; onClick: () => void; danger?: boolean; narrowOnly?: boolean };
type PopKey = "menu" | "hp" | "init";

export function StatBlock({ character, onEdit, onDelete, onDuplicate, onConvertToCreature, onConvertToNPC, hideCollapse }: StatBlockProps) {
  const style = TYPE_STYLE[character.type];
  const isPlayer = character.type === "player";
  const isTemp = character.type !== "player" && !!character.isTemp;
  const storedCollapsed = useStore((state) => state.uiState.collapsedCharacters?.includes(character.id) ?? false);
  const isCollapsed = !hideCollapse && storedCollapsed;
  const { fields, subtitle, traits, actions: actionBlocks } = useMemo(() => readCharacterSheet(character), [character]);

  const [tagModal, setTagModal] = useState<{ open: boolean; tagId?: string; name: string; description: string }>({ open: false, name: "", description: "" });
  const [viewTag, setViewTag] = useState<{ open: boolean; tag: CharacterTag } | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  // Only one popover (menu, HP, initiative) open at a time; the card is raised over its neighbours meanwhile.
  const [pop, setPop] = useState<PopKey | null>(null);
  const popProps = (k: PopKey) => ({ open: pop === k, onOpenChange: (v: boolean) => setPop(v ? k : null) });
  const tags = character.tags || [];

  // Copy the sheet as a styled table, like the bestiary.
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const copyTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  const copySheet = async () => {
    const ok = await copyCharacter(character);
    setCopied(ok ? "ok" : "fail");
    showToast(ok ? `Ficha de ${character.name} copiada. Pégala en Google Docs, Word…` : "No se pudo copiar la ficha.");
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied("idle"), 2200);
  };

  // A click on the header toggles the card, but not the click that ends a drag to reorder.
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const headerHandlers = hideCollapse
    ? {}
    : {
        onPointerDown: (e: React.PointerEvent) => { downAt.current = { x: e.clientX, y: e.clientY }; },
        onClick: (e: React.MouseEvent) => {
          const d = downAt.current;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
          if ((e.target as HTMLElement).closest("button, a, input, [role=menu]")) return;
          actions.toggleCharacterCollapse(character.id);
        },
      };

  const menuItems = [
    { label: "Copiar ficha", icon: Copy, onClick: copySheet, narrowOnly: true },
    onEdit && { label: "Editar", icon: Edit2, onClick: () => onEdit(character), narrowOnly: true },
    onDuplicate && { label: "Duplicar", icon: CopyPlus, onClick: () => onDuplicate(character) },
    character.type === "npc" && onConvertToCreature && { label: "Duplicar como criatura enemiga", icon: Swords, onClick: () => onConvertToCreature(character) },
    character.type === "creature" && onConvertToNPC && { label: "Duplicar como NPC aliado", icon: UserCheck, onClick: () => onConvertToNPC(character) },
    onDelete && { label: "Borrar", icon: Trash2, danger: true, onClick: () => onDelete(character.id) },
  ].filter(Boolean) as MenuItem[];

  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagModal.name.trim()) return;
    const newTag = { id: tagModal.tagId || uuidv4(), name: tagModal.name.trim(), description: tagModal.description.trim() };
    const updatedTags = tagModal.tagId ? tags.map((t) => (t.id === tagModal.tagId ? newTag : t)) : [...tags, newTag];
    actions.updateCharacter(character, { tags: updatedTags });
    setTagModal({ open: false, name: "", description: "" });
    if (viewTag) setViewTag({ open: true, tag: newTag });
  };

  const handleDeleteTag = (id: string) => {
    actions.updateCharacter(character, { tags: tags.filter((t) => t.id !== id) });
    setViewTag(null);
  };

  const props: [string, React.ReactNode][] = [
    ["Velocidad", fields.speed && <Measured text={fields.speed} />],
    [PROP_LABELS[0], fields.props[PROP_LABELS[0]]],
    ["Habilidades", character.skills],
    ...PROP_LABELS.slice(1).map((l) => [l, fields.props[l]] as [string, React.ReactNode]),
    ["Sentidos", character.senses && <Measured text={character.senses} />],
    ["Idiomas", character.languages],
  ];
  const shownProps = props.filter(([, v]) => v);

  return (
    <div className={cn("@container relative bg-dm-bg border border-dm-border border-l-4 rounded-sm text-dm-text font-serif shadow-lg w-full", style.border, pop && "z-30")}>
      {character.image && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 right-0 bottom-0 w-[60%] opacity-15 mix-blend-screen"
            style={{
              backgroundImage: `url(${character.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center right",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)",
              maskImage: "linear-gradient(to right, transparent 0%, black 50%, black 100%)",
            }}
          />
        </div>
      )}

      <div className="relative p-3 sm:p-4 flex flex-col gap-3">
        {/* Header: portrait, name and actions. Clicking it collapses or expands the card. */}
        <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 items-start", !hideCollapse && "cursor-pointer select-none")} {...headerHandlers}>
          {character.image ? (
            <button
              type="button"
              onClick={() => setIsImageViewerOpen(true)}
              title="Ver retrato"
              aria-label={`Ver retrato de ${character.name}`}
              className={cn("row-span-2 w-11 h-11 rounded-full border-2 overflow-hidden bg-dm-bg-hover hover:scale-105 transition-transform", style.ring)}
            >
              <img src={character.image} alt="" className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className={cn("row-span-2 w-11 h-11 rounded-full border-2 flex items-center justify-center bg-dm-bg-hover", style.ring)}>
              <style.Icon size={20} className={style.title} />
            </div>
          )}

          <h3 className={cn("pt-0.5 text-lg sm:text-xl font-bold font-sans leading-tight break-words", style.title)}>{character.name}</h3>

          <div className="flex items-center -mr-1.5 -mt-1">
            {!isTemp && <InitiativeButton character={character} {...popProps("init")} />}
            <span className="hidden @sm:inline-flex">
              <CardAction label="Copiar ficha (para pegarla en Google Docs, Word…)" onClick={copySheet} active={copied === "ok"}>
                {copied === "ok" ? <Check size={16} /> : <Copy size={16} />}
              </CardAction>
            </span>
            {onEdit && (
              <span className="hidden @sm:inline-flex">
                <CardAction label="Editar" onClick={() => onEdit(character)}><Edit2 size={16} /></CardAction>
              </span>
            )}
            <CardMenu items={menuItems} {...popProps("menu")} />
            {!hideCollapse && (
              <CardAction label={isCollapsed ? "Expandir" : "Colapsar"} onClick={() => actions.toggleCharacterCollapse(character.id)}>
                <ChevronDown size={16} className={cn("transition-transform duration-200", !isCollapsed && "rotate-180")} />
              </CardAction>
            )}
          </div>

          {subtitle && <p className="col-span-2 italic text-sm text-dm-muted leading-snug mt-0.5 break-words">{subtitle}</p>}
        </div>

        {/* Key numbers: visible even when the card is collapsed. */}
        <div className="flex flex-wrap gap-1.5">
          <Pill icon={Shield} label="CA" value={character.ac} title={`Clase de Armadura${fields.acDesc ? ` (${fields.acDesc})` : ""}`} />
          {isTemp && <Pill icon={Heart} label="PV" value={character.hpMax} sub={fields.hitDice} title="Puntos de golpe" />}
          <Pill icon={Zap} label="Inic." value={formatMod(character.stats.DEX)} title="Modificador de iniciativa (Destreza)" />
          {isPlayer && character.passivePerception ? (
            <Pill icon={Eye} label="Pasiva" value={character.passivePerception} title="Percepción pasiva" />
          ) : null}
          {!isPlayer && character.cr && <Pill icon={Gauge} label="Desafío" value={character.cr} title="Valor de desafío" />}
        </div>
        {!isTemp && <HpTracker character={character} hitDice={fields.hitDice} {...popProps("hp")} />}

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden -mx-1 px-1"
            >
              <div className="flex flex-col gap-3">
                <Divider />
                <div className="grid grid-cols-3 @xs:grid-cols-6 gap-1.5 text-center">
                  <Stat name="FUE" val={character.stats.STR} />
                  <Stat name="DES" val={character.stats.DEX} />
                  <Stat name="CON" val={character.stats.CON} />
                  <Stat name="INT" val={character.stats.INT} />
                  <Stat name="SAB" val={character.stats.WIS} />
                  <Stat name="CAR" val={character.stats.CHA} />
                </div>

                {shownProps.length > 0 && (
                  <>
                    <Divider />
                    <div className="space-y-1 text-sm">
                      {shownProps.map(([label, value]) => (
                        <div key={label}>
                          <strong className="text-dm-accent font-semibold">{label}</strong> {value}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {traits.length > 0 && (
                  <>
                    <Divider />
                    <Blocks blocks={traits} />
                  </>
                )}

                {actionBlocks.length > 0 && (
                  <div>
                    {actionBlocks[0].kind !== "heading" && <SectionTitle>Acciones</SectionTitle>}
                    <Blocks blocks={actionBlocks} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(tags.length > 0 || !isCollapsed) && (
          <div className="pt-2 border-t border-dm-border/70 flex flex-wrap gap-1.5 items-center">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setViewTag({ open: true, tag })}
                title={tag.description || tag.name}
                className="px-2 py-0.5 rounded-sm text-xs font-sans bg-dm-bg-hover border border-dm-accent/70 text-dm-accent hover:bg-dm-accent hover:text-dm-bg transition-colors"
              >
                {tag.name}
              </button>
            ))}
            {!isCollapsed && (
              <button
                onClick={() => setTagModal({ open: true, name: "", description: "" })}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-dm-bg-hover border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors"
                title="Añadir tag"
                aria-label="Añadir tag"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {viewTag && viewTag.open && (
        <Modal isOpen={viewTag.open} onClose={() => setViewTag(null)} title={viewTag.tag.name}>
          <div className="flex flex-col gap-4">
            <div className="text-sm whitespace-pre-wrap text-dm-text min-h-[50px]">
              {viewTag.tag.description || <span className="opacity-50 italic">Sin descripción.</span>}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
              <Button type="button" variant="secondary" onClick={() => setTagModal({ open: true, tagId: viewTag.tag.id, name: viewTag.tag.name, description: viewTag.tag.description })}>
                Editar
              </Button>
              <Button type="button" className="bg-dm-danger hover:bg-dm-danger-hover text-dm-text-bright" onClick={() => handleDeleteTag(viewTag.tag.id)}>
                Borrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={tagModal.open} onClose={() => setTagModal({ open: false, name: "", description: "" })} title={tagModal.tagId ? "Editar Tag" : "Nuevo Tag"}>
        <form onSubmit={handleSaveTag} className="flex flex-col gap-4">
          <Input label="Nombre del Tag" value={tagModal.name} onChange={(e) => setTagModal({ ...tagModal, name: e.target.value })} required placeholder="Ej. Maldito" />
          <Textarea label="Descripción" value={tagModal.description} onChange={(e) => setTagModal({ ...tagModal, description: e.target.value })} placeholder="Detalles de este tag..." rows={4} />
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
            <Button type="button" variant="ghost" onClick={() => setTagModal({ open: false, name: "", description: "" })}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {character.image && (
        <Lightbox isOpen={isImageViewerOpen} onClose={() => setIsImageViewerOpen(false)} src={character.image} title={character.name} />
      )}
    </div>
  );
}

function CardAction({ label, onClick, danger, active, children }: { label: string; onClick: () => void; danger?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "p-2.5 sm:p-1.5 rounded-sm transition-colors",
        active ? "text-dm-accent" : "text-dm-muted",
        danger ? "hover:text-dm-danger" : "hover:text-dm-accent"
      )}
    >
      {children}
    </button>
  );
}

/** "⋯" button with the less frequent actions (duplicate, convert, delete). */
function CardMenu({ items, open, onOpenChange }: { items: MenuItem[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!items.length) return null;
  // On wide cards copy / edit are inline, so a menu with nothing else is not shown there.
  const onlyNarrow = items.every((it) => it.narrowOnly);
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      className={cn(onlyNarrow && "@sm:hidden")}
      panelClassName="min-w-52 py-1"
      trigger={<CardAction label="Más acciones" onClick={() => onOpenChange(!open)} active={open}><MoreVertical size={16} /></CardAction>}
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          onClick={() => { onOpenChange(false); it.onClick(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
            it.narrowOnly && "@sm:hidden",
            it.danger ? "text-dm-danger hover:bg-dm-danger/10 border-t border-dm-border mt-1" : "text-dm-text hover:bg-dm-bg-hover hover:text-dm-accent"
          )}
        >
          <it.icon size={15} className="shrink-0" /> {it.label}
        </button>
      ))}
    </Popover>
  );
}

function Pill({ icon: Icon, label, value, sub, title }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1.5 px-2 py-1 bg-dm-bg-hover border border-dm-border rounded-sm text-xs font-sans">
      <Icon size={13} className="text-dm-accent shrink-0" />
      <span className="text-[10px] uppercase tracking-wider text-dm-muted">{label}</span>
      <span className="font-bold text-dm-text-bright tabular-nums">{value}</span>
      {sub && <span className="text-dm-muted tabular-nums">({sub})</span>}
    </span>
  );
}

function Stat({ name, val }: { name: string; val: number }) {
  return (
    <div className="flex flex-col items-center bg-dm-bg-hover border border-dm-border rounded-sm py-1 font-sans">
      <span className="text-[10px] font-bold tracking-widest text-dm-accent">{name}</span>
      <span className="text-base font-bold text-dm-text-bright tabular-nums leading-tight">{formatMod(val)}</span>
      <span className="text-[10px] text-dm-muted tabular-nums">{val}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-dm-accent/60 via-dm-accent/20 to-transparent" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-display uppercase tracking-widest text-dm-accent border-b border-dm-accent/40 pb-1 mb-2 mt-1">{children}</h4>;
}

/** Traits or actions: named entries ("Name. Text") and section titles. */
function Blocks({ blocks }: { blocks: SheetBlock[] }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <SectionTitle key={i}>{b.text}</SectionTitle>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.name && <strong className="italic font-semibold text-dm-text-bright">{b.name}. </strong>}
            <Measured text={b.text} />
          </p>
        )
      )}
    </div>
  );
}
