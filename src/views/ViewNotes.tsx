import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Plus, X, Edit2, Trash2, StickyNote, Pin, Copy, CopyPlus, Check, Search, ChevronLeft, ChevronRight,
  ListChecks, Heading2, Dices, Zap, Maximize2, LayoutTemplate, Palette, Tag, HelpCircle, Keyboard, Type, Sparkles,
} from "lucide-react";
import { useStore, actions } from "../store/useStore";
import { Note } from "../types";
import { cn, downloadJSON } from "../lib/utils";
import { showRoll } from "../components/RollToasts";
import { NoteMarkdown } from "../components/NoteMarkdown";
import {
  NOTE_CATEGORIES, NOTE_COLORS, DEFAULT_NOTE_COLOR, noteCategory, noteTint, noteBackground, noteLabel,
  taskProgress, toggleTaskAt, extractTags, relativeTime, fullDate, isTemplateText,
} from "../lib/notes";
import { Overlay, Modal, useModalLayer } from "../components/ui/Modal";
import { LIST_MAX_HEIGHT, listClass, optionClass, useListPosition, useOutsidePress } from "../components/ui/popupList";
import { createPortal } from "react-dom";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { Select } from "../components/ui/Select";
import { ImportExportActions, arrayOrKey, looksLike } from "../components/ImportExportActions";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { DescriptionEditor } from "../components/DescriptionEditor";

type Sort = "manual" | "recent" | "alpha";

const fieldClass = "bg-black/30 border border-dm-border p-2.5 text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none";
const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-dm-muted mb-1.5";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const isTypingTarget = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const openDialogs = () => document.querySelectorAll('[role="dialog"]').length;

/** Every word must match; "#tag" words only look at tags. */
function matchesQuery(n: Note, query: string) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = norm(`${n.title} ${n.content} ${noteCategory(n.category).label}`);
  const tags = (n.tags || []).map(norm);
  return terms.every((t) => (t.startsWith("#") ? tags.some((tag) => tag.startsWith(t.slice(1))) : hay.includes(t) || tags.some((tag) => tag.includes(t))));
}

/** Puts a reordered subset back into the slots it occupied in the full list. */
function mergeOrder(all: Note[], subset: Note[]) {
  const ids = new Set(subset.map((n) => n.id));
  let i = 0;
  return all.map((n) => (ids.has(n.id) ? subset[i++] : n));
}

/** True when the content is taller than its clamped box (so the fade-out is only shown then). */
function useOverflow<T extends HTMLElement>(dep: unknown) {
  const outer = useRef<T>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const check = () => setOverflow(i.offsetHeight > o.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(i);
    return () => ro.disconnect();
  }, [dep]);
  return { outer, inner, overflow };
}

// ---------------------------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------------------------

export function ViewNotes() {
  const notes = useStore((s) => s.notes);
  const draft = useStore((s) => s.uiState.draftNote) || null;
  const sort: Sort = useStore((s) => s.uiState.notesSort) || "manual";
  const category = useStore((s) => s.uiState.notesCategory);
  const highlightedNoteId = useStore((s) => s.uiState.highlightedNoteId);

  const setDraft = (note: Partial<Note> | null) => actions.updateUI({ draftNote: note });
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((n) => n.tags || []))).sort((a, b) => a.localeCompare(b, "es")), [notes]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    notes.forEach((n) => { const id = noteCategory(n.category).id; c[id] = (c[id] || 0) + 1; });
    return c;
  }, [notes]);

  const visible = useMemo(() => {
    let list = notes.filter((n) => (!category || noteCategory(n.category).id === category) && matchesQuery(n, query));
    if (sort === "recent") list = [...list].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    if (sort === "alpha") list = [...list].sort((a, b) => noteLabel(a).localeCompare(noteLabel(b), "es", { sensitivity: "base" }));
    return list;
  }, [notes, category, query, sort]);
  const pinned = visible.filter((n) => n.pinned);
  const others = visible.filter((n) => !n.pinned);
  const ordered = useMemo(() => [...pinned, ...others], [visible]);
  const filtering = !!query.trim() || !!category;

  // Opened from the global search.
  useEffect(() => {
    if (!highlightedNoteId) return;
    if (notes.some((n) => n.id === highlightedNoteId)) setViewingId(highlightedNoteId);
    actions.updateUI({ highlightedNoteId: undefined });
  }, [highlightedNoteId]);

  // "/" focuses the search, "N" the quick note, "?" opens the guide.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || openDialogs()) return;
      if (e.key === "?") { e.preventDefault(); setHelpOpen(true); }
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); quickRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roll = showRoll;

  const newNote = (cat = category || "general", content?: string) =>
    setDraft({ title: "", content: content ?? noteCategory(cat).template, color: DEFAULT_NOTE_COLOR, category: cat, tags: [] });

  const handleSave = () => {
    if (!draft) return;
    const { id, ...data } = draft;
    const clean = { ...data, title: (data.title || "").trim(), content: (data.content || "").replace(/\s+$/, "") };
    if (!clean.title && !clean.content.trim()) return;
    if (id) actions.updateNote(id, clean);
    else actions.addNote({ title: "", content: "", color: DEFAULT_NOTE_COLOR, ...clean });
    setDraft(null);
  };

  const togglePin = (n: Note) => actions.updateNote(n.id, { pinned: !n.pinned }, false);
  const filterByTag = (tag: string) => { setQuery(`#${tag}`); setViewingId(null); };
  const setSort = (s: Sort) => actions.updateUI({ notesSort: s });
  const setCategory = (c?: string) => actions.updateUI({ notesCategory: c });

  const card = (note: Note) => (
    <NoteCard
      note={note}
      onOpen={() => setViewingId(note.id)}
      onDelete={() => setDeleteId(note.id)}
      onPin={() => togglePin(note)}
      onTag={filterByTag}
    />
  );

  const grid = (items: Note[]) => {
    const cls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 items-start w-full";
    if (sort !== "manual") return <div className={cls}>{items.map((n) => <div key={n.id}>{card(n)}</div>)}</div>;
    return <SortableGrid className={cls} items={items} onReorder={(sub) => actions.reorderNotes(mergeOrder(notes, sub))} renderItem={card} />;
  };

  const presentCategories = NOTE_CATEGORIES.filter((c) => counts[c.id] || c.id === category);
  const viewing = viewingId ? notes.find((n) => n.id === viewingId) || null : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={StickyNote}
        title={<>Bloc de Notas {notes.length > 0 && <span className="ml-1 text-xs text-dm-muted tabular-nums">{notes.length}</span>}</>}
        shortTitle="Notas"
        actions={
          <>
            <ToolbarButton icon={HelpCircle} label="Guía de notas (?)" onClick={() => setHelpOpen(true)} />
            <ImportExportActions
              noun="Notas"
              onExport={() => downloadJSON(notes, "ndms_notas.json")}
              parse={arrayOrKey("notes", looksLike.note)}
              onImport={(items, mode) => actions.importCollection("notes", items, mode)}
              invalidMessage="El archivo no parece contener notas válidas."
            />
            <ToolbarButton icon={Plus} label="Nueva Nota" shortLabel="Nueva" variant="primary" showLabel="always" onClick={() => newNote()} />
          </>
        }
      >
        {notes.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-md">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dm-muted pointer-events-none" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); } }}
                  placeholder="Buscar o #etiqueta"
                  aria-label="Buscar en las notas"
                  className="w-full h-10 sm:h-9 pl-8 pr-14 bg-dm-bg-darker border border-dm-border text-sm text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-dm-muted hover:text-dm-text-bright"><X size={15} /></button>
                ) : (
                  <kbd className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-dm-muted border border-dm-border rounded px-1.5 pointer-events-none">/</kbd>
                )}
              </div>
              <Select<Sort>
                value={sort}
                onChange={setSort}
                aria-label="Orden de las notas"
                className="w-auto shrink-0 h-10 sm:h-9 pr-8 bg-dm-bg-darker text-xs"
                options={[
                  { value: "manual", label: "Manual" },
                  { value: "recent", label: "Recientes" },
                  { value: "alpha", label: "A – Z" },
                ]}
              />
            </div>
            {presentCategories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Filtrar por tipo">
                <FilterChip active={!category} onClick={() => setCategory(undefined)} label="Todas" count={notes.length} />
                {presentCategories.map((c) => (
                  <FilterChip key={c.id} active={category === c.id} onClick={() => setCategory(category === c.id ? undefined : c.id)} icon={c.icon} label={c.label} count={counts[c.id] || 0} />
                ))}
              </div>
            )}
          </div>
        )}
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar pb-24 sm:pb-16 text-dm-text">
        <QuickCapture inputRef={quickRef} category={category} onExpand={(text) => newNote(category || "general", text)} />

        {notes.length === 0 ? (
          <EmptyState onTemplate={(id) => newNote(id)} />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-dm-muted text-center gap-3">
            <Search size={32} className="opacity-50" />
            <p>Ninguna nota coincide con el filtro.</p>
            <button type="button" onClick={() => { setQuery(""); setCategory(undefined); }} className="text-xs uppercase tracking-widest text-dm-accent hover:underline">Quitar filtros</button>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <section>
                <SectionTitle icon={Pin} label="Fijadas" count={pinned.length} />
                {grid(pinned)}
              </section>
            )}
            {others.length > 0 && (
              <section>
                {pinned.length > 0 && <SectionTitle icon={StickyNote} label={filtering ? "Resultados" : "Notas"} count={others.length} />}
                {grid(others)}
              </section>
            )}
            {sort === "manual" && notes.length > 1 && (
              <p className="hidden sm:block text-center text-[11px] text-dm-muted/70">Arrastra las notas para reordenarlas · <kbd className="font-sans">N</kbd> nota rápida · <kbd className="font-sans">/</kbd> buscar · <button type="button" onClick={() => setHelpOpen(true)} className="underline-offset-2 hover:underline hover:text-dm-accent"><kbd className="font-sans">?</kbd> guía de formato y atajos</button></p>
            )}
          </div>
        )}
      </div>

      {viewing && (
        <NoteViewer
          note={viewing}
          position={ordered.findIndex((n) => n.id === viewing.id)}
          total={ordered.length}
          onNavigate={(dir) => {
            const i = ordered.findIndex((n) => n.id === viewing.id);
            const next = ordered[i + dir];
            if (next) setViewingId(next.id);
          }}
          onClose={() => setViewingId(null)}
          onEdit={() => { setDraft(viewing); setViewingId(null); }}
          onDelete={() => { setDeleteId(viewing.id); setViewingId(null); }}
          onDuplicate={() => { const id = actions.duplicateNote(viewing.id); if (id) setViewingId(id); }}
          onPin={() => togglePin(viewing)}
          onTag={filterByTag}
          onRoll={(n) => roll(n, noteLabel(viewing))}
        />
      )}

      {draft && <NoteEditor draft={draft} setDraft={setDraft} allTags={allTags} onClose={() => setDraft(null)} onSave={handleSave} onRoll={(n) => roll(n, "Ejemplo")} />}

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Guía de notas">
        <NotesHelp onRoll={(n) => roll(n, "Ejemplo")} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && actions.deleteNote(deleteId)}
        title="Eliminar Nota"
        message="¿Estás seguro de que quieres eliminar esta nota de tu panel?"
      />

    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------------------------

function FilterChip({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ElementType }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs transition-colors whitespace-nowrap",
        active ? "border-dm-accent bg-dm-accent text-dm-bg-darker font-bold" : "border-dm-border bg-dm-bg-darker/50 text-dm-muted hover:text-dm-accent hover:border-dm-accent"
      )}
    >
      {Icon && <Icon size={13} />}
      {label}
      <span className={cn("tabular-nums text-[10px]", active ? "opacity-80" : "opacity-60")}>{count}</span>
    </button>
  );
}

function SectionTitle({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-dm-muted">
      <Icon size={13} /> {label} <span className="tabular-nums opacity-60">{count}</span>
      <span className="flex-1 h-px bg-dm-border ml-1" />
    </h3>
  );
}

function QuickCapture({ inputRef, category, onExpand }: { inputRef: React.RefObject<HTMLInputElement | null>; category?: string; onExpand: (text: string) => void }) {
  const [text, setText] = useState("");
  const [flash, setFlash] = useState(false);
  const cat = noteCategory(category);

  const submit = () => {
    const { text: body, tags } = extractTags(text);
    if (!body) return;
    actions.addNote({ title: "", content: body, color: DEFAULT_NOTE_COLOR, category: cat.id, tags });
    setText("");
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className={cn(
        "group/quick flex items-center gap-2 mb-5 pl-3 pr-1.5 h-12 rounded-lg border border-dashed bg-dm-bg/40 transition-colors focus-within:border-solid focus-within:border-dm-accent focus-within:bg-dm-bg/80",
        flash ? "border-dm-accent bg-dm-accent/10" : "border-dm-border"
      )}
    >
      <Zap size={16} className={cn("shrink-0 transition-colors", flash ? "text-dm-accent" : "text-dm-muted group-focus-within/quick:text-dm-accent")} />
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setText(""); e.currentTarget.blur(); }
          if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); onExpand(extractTags(text).text); setText(""); }
        }}
        placeholder={category && category !== "general" ? `Nota rápida de ${cat.label}… (Enter guarda)` : "Nota rápida… #etiqueta y Enter"}
        aria-label="Nota rápida"
        className="flex-1 min-w-0 bg-transparent text-sm text-dm-text-bright placeholder:text-dm-muted outline-none"
      />
      {text.trim() ? (
        <>
          <button type="button" onClick={() => { onExpand(extractTags(text).text); setText(""); }} title="Abrir en el editor (Mayús+Enter)" aria-label="Abrir en el editor" className="p-2 text-dm-muted hover:text-dm-accent">
            <Maximize2 size={15} />
          </button>
          <button type="submit" className="h-9 px-3 bg-dm-accent text-dm-bg-darker text-xs font-bold uppercase tracking-widest hover:bg-dm-accent-hover">Guardar</button>
        </>
      ) : (
        <kbd className="hidden sm:block mr-1.5 text-[10px] text-dm-muted border border-dm-border rounded px-1.5">N</kbd>
      )}
    </form>
  );
}

function EmptyState({ onTemplate }: { onTemplate: (category: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4 border border-dashed border-dm-border rounded-lg bg-dm-bg/30">
      <StickyNote size={40} className="text-dm-muted/60 mb-3" />
      <p className="text-dm-text-bright font-display text-lg">Tu bloc está vacío</p>
      <p className="text-sm text-dm-muted mt-1 max-w-md">
        Apunta lo que surja en la mesa con la barra de nota rápida, o empieza con una plantilla. Pulsa <kbd className="border border-dm-border rounded px-1 text-xs">?</kbd> para ver la guía de formato.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-xl">
        {NOTE_CATEGORIES.filter((c) => c.template).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onTemplate(c.id)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-dm-border bg-dm-bg-darker/60 text-sm text-dm-text hover:border-dm-accent hover:text-dm-accent transition-colors"
          >
            <c.icon size={15} /> {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, className, children, pressed }: { label: string; onClick: () => void; className?: string; children: React.ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={cn("p-1.5 rounded text-dm-muted hover:bg-black/25 transition-[color,opacity,background-color]", className)}
    >
      {children}
    </button>
  );
}

function TagChip({ tag, onClick }: { tag: string; onClick?: () => void }) {
  const cls = "inline-flex items-center px-1.5 py-0.5 rounded-full bg-black/25 border border-white/5 text-[11px] leading-none text-dm-text-muted";
  if (!onClick) return <span className={cls}>#{tag}</span>;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} title={`Ver notas con #${tag}`} className={cn(cls, "hover:text-dm-accent hover:border-dm-accent/40")}>
      #{tag}
    </button>
  );
}

function Progress({ done, total, tint }: { done: number; total: number; tint: string }) {
  const complete = done === total;
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", complete && "text-dm-accent")} title={`${done} de ${total} completadas`}>
      <ListChecks size={12} />
      {done}/{total}
      <span className="w-10 h-1 rounded-full bg-black/30 overflow-hidden">
        <span className="block h-full rounded-full transition-[width]" style={{ width: `${(done / total) * 100}%`, background: tint }} />
      </span>
    </span>
  );
}

function NoteCard({ note, onOpen, onDelete, onPin, onTag }: { note: Note; onOpen: () => void; onDelete: () => void; onPin: () => void; onTag: (tag: string) => void }) {
  const cat = noteCategory(note.category);
  const tint = noteTint(note.color);
  const hasTitle = !!note.title?.trim();
  const progress = taskProgress(note.content);
  const tags = note.tags || [];
  const date = note.updatedAt || note.createdAt;
  const { outer, inner, overflow } = useOverflow<HTMLDivElement>(!!note.content.trim());
  const isGeneral = cat.id === "general";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(); } }}
      aria-label={noteLabel(note)}
      style={{ background: noteBackground(note.color), "--note-tint": tint } as React.CSSProperties}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-dm-border pl-5 pr-4 py-3.5 overflow-hidden cursor-pointer select-none",
        "shadow-md shadow-black/25 transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-(--note-tint) hover:shadow-lg hover:shadow-black/40 can-hover:hover:-translate-y-0.5 active:scale-[0.99]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dm-accent",
        note.pinned && "ring-1 ring-(--note-tint)/40"
      )}
    >
      <span aria-hidden className="absolute left-0 inset-y-0 w-1" style={{ background: tint }} />

      <div className="absolute top-1.5 right-1.5 flex items-center">
        <IconButton
          label={note.pinned ? "Desfijar" : "Fijar arriba"}
          pressed={!!note.pinned}
          onClick={onPin}
          className={note.pinned ? "text-dm-accent" : "can-hover:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-dm-accent"}
        >
          <Pin size={14} className={cn(note.pinned && "fill-current")} />
        </IconButton>
        <IconButton label="Eliminar nota" onClick={onDelete} className="can-hover:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-dm-danger">
          <Trash2 size={14} />
        </IconButton>
      </div>

      {!isGeneral && (
        <span className="inline-flex items-center gap-1.5 pr-16 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tint }}>
          <cat.icon size={12} /> {cat.label}
        </span>
      )}
      {hasTitle && (
        <h3 className={cn("font-display font-bold text-base leading-snug text-dm-accent break-words line-clamp-2", isGeneral && "pr-16")}>{note.title}</h3>
      )}
      {note.content.trim() && (
        <div
          ref={outer}
          className={cn(
            "max-h-40 overflow-hidden pointer-events-none text-dm-text",
            // Compact headings in the preview, so a "## Resumen" doesn't take the whole card.
            "[&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:mt-2 [&_h2]:mt-2 [&_h3]:mt-2 [&_h1]:mb-1 [&_h2]:mb-1 [&_h3]:mb-1 [&_h2]:border-0 [&_h2]:pb-0 [&_p]:mb-1.5 [&_ul]:mb-1.5",
            hasTitle ? "text-sm leading-relaxed" : "text-[15px] leading-relaxed font-serif",
            !hasTitle && isGeneral && "pr-14",
            overflow && "[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]"
          )}
        >
          <div ref={inner}>
            <NoteMarkdown content={note.content} />
          </div>
        </div>
      )}

      {(tags.length > 0 || progress.total > 0 || date) && (
        <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap pt-1 text-[11px] text-dm-muted">
          {progress.total > 0 && <Progress {...progress} tint={tint} />}
          {tags.map((t) => <TagChip key={t} tag={t} onClick={() => onTag(t)} />)}
          {date && <span className="ml-auto whitespace-nowrap" title={fullDate(date)}>{relativeTime(date)}</span>}
        </div>
      )}
    </article>
  );
}

function NoteViewer({ note, position, total, onNavigate, onClose, onEdit, onDelete, onDuplicate, onPin, onTag, onRoll }: {
  note: Note;
  position: number;
  total: number;
  onNavigate: (dir: -1 | 1) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPin: () => void;
  onTag: (tag: string) => void;
  onRoll: (notation: string) => void;
}) {
  const cat = noteCategory(note.category);
  const tint = noteTint(note.color);
  const progress = taskProgress(note.content);
  const [copied, setCopied] = useState(false);
  const live = useRef({ onNavigate, onEdit, onPin });
  live.current = { onNavigate, onEdit, onPin };

  const toggleTask = useCallback((offset: number) => actions.updateNote(note.id, { content: toggleTaskAt(note.content, offset) }), [note.id, note.content]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || openDialogs() > 1) return;
      if (e.key === "ArrowLeft") live.current.onNavigate(-1);
      else if (e.key === "ArrowRight") live.current.onNavigate(1);
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); live.current.onEdit(); }
      else if (e.key === "p" || e.key === "P") live.current.onPin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note.title ? `${note.title}\n\n${note.content}` : note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  const btn = "p-2 rounded text-dm-muted hover:text-dm-accent hover:bg-black/25 transition-colors";

  return (
    <Overlay isOpen onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={noteLabel(note)}
        style={{ background: noteBackground(note.color, 10) }}
        className="relative w-full max-w-2xl max-h-full sm:max-h-[88vh] flex flex-col rounded-xl border border-dm-border shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: tint }} />

        <header className="flex items-start gap-3 px-4 sm:px-6 pt-5 pb-3 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tint }}>
              <cat.icon size={12} /> {cat.label}
              {note.pinned && <span className="inline-flex items-center gap-1 text-dm-muted"><Pin size={10} className="fill-current" /> Fijada</span>}
            </div>
            {note.title && <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-dm-accent break-words leading-tight">{note.title}</h2>}
          </div>
          <div className="flex items-center shrink-0 -mr-2 -mt-1">
            <button type="button" className={cn(btn, note.pinned && "text-dm-accent")} onClick={onPin} title={note.pinned ? "Desfijar (P)" : "Fijar arriba (P)"} aria-label={note.pinned ? "Desfijar" : "Fijar arriba"} aria-pressed={!!note.pinned}>
              <Pin size={17} className={cn(note.pinned && "fill-current")} />
            </button>
            <button type="button" className={cn(btn, "hidden sm:block")} onClick={copy} title="Copiar texto" aria-label="Copiar texto">
              {copied ? <Check size={17} className="text-dm-accent" /> : <Copy size={17} />}
            </button>
            <button type="button" className={cn(btn, "hidden sm:block")} onClick={onDuplicate} title="Duplicar" aria-label="Duplicar"><CopyPlus size={17} /></button>
            <button type="button" className={btn} onClick={onEdit} title="Editar (E)" aria-label="Editar"><Edit2 size={17} /></button>
            <button type="button" className={cn(btn, "hover:text-dm-danger")} onClick={onDelete} title="Eliminar" aria-label="Eliminar"><Trash2 size={17} /></button>
            <button type="button" className={btn} onClick={onClose} title="Cerrar (Esc)" aria-label="Cerrar"><X size={19} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 text-base text-dm-text font-serif leading-relaxed select-text" onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest("button, a")) onEdit(); }}>
          {note.content.trim() ? (
            <NoteMarkdown content={note.content} onRoll={onRoll} onToggleTask={toggleTask} />
          ) : (
            <p className="italic text-dm-muted">Nota vacía. Doble clic para escribir.</p>
          )}
        </div>

        <footer className="flex items-center gap-x-3 gap-y-2 flex-wrap px-4 sm:px-6 py-2.5 border-t border-white/5 text-xs text-dm-muted bg-black/10">
          {progress.total > 0 && <Progress {...progress} tint={tint} />}
          {(note.tags || []).map((t) => <TagChip key={t} tag={t} onClick={() => onTag(t)} />)}
          {(note.updatedAt || note.createdAt) && (
            <span className="whitespace-nowrap" title={note.createdAt ? `Creada: ${fullDate(note.createdAt)}` : undefined}>
              Editada {relativeTime(note.updatedAt || note.createdAt)}
            </span>
          )}
          {total > 1 && position >= 0 && (
            <div className="ml-auto flex items-center gap-1">
              <button type="button" disabled={position <= 0} onClick={() => onNavigate(-1)} title="Anterior (←)" aria-label="Nota anterior" className="p-1.5 rounded hover:text-dm-accent hover:bg-black/25 disabled:opacity-30 disabled:pointer-events-none"><ChevronLeft size={16} /></button>
              <span className="tabular-nums min-w-12 text-center">{position + 1} / {total}</span>
              <button type="button" disabled={position >= total - 1} onClick={() => onNavigate(1)} title="Siguiente (→)" aria-label="Nota siguiente" className="p-1.5 rounded hover:text-dm-accent hover:bg-black/25 disabled:opacity-30 disabled:pointer-events-none"><ChevronRight size={16} /></button>
            </div>
          )}
        </footer>
      </div>
    </Overlay>
  );
}

const SNIPPETS = [
  { icon: ListChecks, label: "Casilla marcable", text: "- [ ] ", lineStart: true },
  { icon: Heading2, label: "Encabezado", text: "## ", lineStart: true },
  { icon: Dices, label: "Tirada (1d20)", text: "1d20" },
];

type HelpExample = { label: string; code: string; hint?: string };

const FORMAT_EXAMPLES: HelpExample[] = [
  { label: "Negrita y cursiva", code: "**Importante** y *susurrado*" },
  { label: "Encabezado", code: "## La cripta" },
  { label: "Lista", code: "- Tres goblins\n- Un lobo" },
  { label: "Lista numerada", code: "1. Entrar\n2. Saquear" },
  { label: "Texto para leer en voz alta", code: "> Una brisa helada recorre la sala…" },
  { label: "Separador", code: "---" },
  { label: "Enlace", code: "[Mapa de Faerûn](https://example.com)" },
];

const DND_EXAMPLES: HelpExample[] = [
  { label: "Casillas", code: "- [ ] Encontrar la llave\n- [x] Hablar con el alcalde", hint: "Al ver la nota se marcan con un clic. Prueba aquí:" },
  { label: "Tiradas", code: "Espada larga: 1d20+5, daño 1d8+3", hint: "Cualquier tirada escrita (d20, 2d6+1, 4d6-2…) se lanza con un clic. Prueba aquí:" },
];

const SHORTCUTS: { keys: string[]; text: string }[] = [
  { keys: ["N"], text: "Escribir una nota rápida" },
  { keys: ["/"], text: "Buscar en las notas (también #etiqueta)" },
  { keys: ["?"], text: "Abrir esta guía" },
  { keys: ["Mayús", "Enter"], text: "En la nota rápida: abrirla en el editor" },
  { keys: ["Ctrl", "Enter"], text: "En el editor: guardar" },
  { keys: ["Enter"], text: "En una lista: siguiente elemento (en uno vacío, termina la lista)" },
  { keys: ["←", "→"], text: "Al ver una nota: anterior / siguiente" },
  { keys: ["E"], text: "Al ver una nota: editarla (o doble clic en el texto)" },
  { keys: ["P"], text: "Al ver una nota: fijarla arriba" },
  { keys: ["Esc"], text: "Cerrar" },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-dm-border border-b-2 bg-dm-bg-darker text-[11px] font-sans text-dm-text-bright">{children}</kbd>
);

/** One "what you type → what you get" row. Its checkboxes can be ticked to try them out. */
function HelpRow({ example, onRoll }: { example: HelpExample; onRoll?: (n: string) => void }) {
  const [content, setContent] = useState(example.code);
  const toggle = useCallback((offset: number) => setContent((c) => toggleTaskAt(c, offset)), []);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-1.5 py-2.5 border-b border-dm-border/50 last:border-0">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-dm-muted mb-1">{example.label}</div>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs text-dm-text-bright bg-black/30 border border-dm-border/60 rounded px-2 py-1.5">{example.code}</pre>
      </div>
      <div className="min-w-0 text-sm text-dm-text leading-relaxed sm:pt-5">
        {example.hint && <p className="text-[11px] text-dm-muted italic mb-1">{example.hint}</p>}
        <NoteMarkdown content={content} onRoll={onRoll} onToggleTask={toggle} />
      </div>
    </div>
  );
}

function HelpSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-dm-accent mb-1">
        <Icon size={14} /> {title}
      </h3>
      {children}
    </section>
  );
}

/** Format cheat sheet for notes; `compact` (inside the editor) leaves out the shortcut list. */
function NotesHelp({ compact, onRoll }: { compact?: boolean; onRoll?: (n: string) => void }) {
  return (
    <div className="space-y-5">
      {!compact && (
        <p className="text-sm text-dm-text-muted leading-relaxed">
          Las notas usan <strong className="text-dm-text-bright">Markdown</strong>: escribes texto normal con unos pocos símbolos y se muestra con formato.
          No hace falta memorizarlo: los botones de la barra del editor (<ListChecks size={12} className="inline" /> casilla, <Heading2 size={12} className="inline" /> encabezado, <Dices size={12} className="inline" /> tirada, tabla…) lo escriben por ti.
        </p>
      )}

      <HelpSection icon={Sparkles} title="Extras de rol">
        {DND_EXAMPLES.map((ex) => <HelpRow key={ex.label} example={ex} onRoll={onRoll} />)}
        <p className="text-xs text-dm-muted leading-relaxed pt-2">
          <strong className="text-dm-text">Etiquetas:</strong> en la nota rápida, las palabras con <code className="text-dm-accent">#</code> (p. ej. <code className="text-dm-accent">#villano</code>) se guardan como etiquetas.
          Haz clic en una etiqueta para ver todas las notas que la llevan.
        </p>
      </HelpSection>

      <HelpSection icon={Type} title="Formato de texto">
        {FORMAT_EXAMPLES.map((ex) => <HelpRow key={ex.label} example={ex} />)}
        <p className="text-xs text-dm-muted leading-relaxed pt-2">
          Un salto de línea se respeta tal cual; deja una línea en blanco para separar párrafos. Para tablas, usa el botón de tabla de la barra.
        </p>
      </HelpSection>

      {!compact && (
        <HelpSection icon={Keyboard} title="Atajos de teclado">
          <ul className="divide-y divide-dm-border/50">
            {SHORTCUTS.map((s) => (
              <li key={s.text} className="flex items-center gap-3 py-2 text-sm text-dm-text">
                <span className="flex items-center gap-1 shrink-0 w-28">
                  {s.keys.map((k, i) => <React.Fragment key={k}>{i > 0 && <span className="text-dm-muted text-xs">+</span>}<Kbd>{k}</Kbd></React.Fragment>)}
                </span>
                <span className="min-w-0">{s.text}</span>
              </li>
            ))}
          </ul>
        </HelpSection>
      )}
    </div>
  );
}

function NoteEditor({ draft, setDraft, allTags, onClose, onSave, onRoll }: {
  draft: Partial<Note>;
  setDraft: (n: Partial<Note>) => void;
  allTags: string[];
  onClose: () => void;
  onSave: () => void;
  onRoll: (notation: string) => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const cat = noteCategory(draft.category);
  const tint = noteTint(draft.color);
  const content = draft.content || "";
  const canSave = !!(draft.title || "").trim() || !!content.trim();

  const pickCategory = (id: string) => {
    const next = noteCategory(id);
    setDraft({ ...draft, category: id, content: isTemplateText(content) ? next.template : content });
  };

  return (
    <Overlay isOpen onClose={onClose} closeOnBackdrop={false}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onSave(); } }}
        role="dialog"
        aria-modal="true"
        aria-label={draft.id ? "Editar nota" : "Nueva nota"}
        style={{ background: noteBackground(draft.color, 10) }}
        className="relative w-full max-w-2xl max-h-full sm:max-h-[90vh] flex flex-col rounded-xl border border-dm-border shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 transition-colors" style={{ background: tint }} />

        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 pb-3 border-b border-white/5">
          <h2 className="flex-1 text-sm text-dm-accent tracking-[0.2em] uppercase font-light">{draft.id ? "Editar nota" : "Nueva nota"}</h2>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}
            aria-pressed={!!draft.pinned}
            title={draft.pinned ? "Fijada arriba" : "Fijar arriba"}
            className={cn("inline-flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors", draft.pinned ? "text-dm-accent bg-dm-accent/10" : "text-dm-muted hover:text-dm-accent")}
          >
            <Pin size={14} className={cn(draft.pinned && "fill-current")} /> <span className="hidden sm:inline">{draft.pinned ? "Fijada" : "Fijar"}</span>
          </button>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 -mr-1.5 text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-4">
          <input
            type="text"
            placeholder="Título (opcional)"
            aria-label="Título"
            autoFocus={!draft.id}
            value={draft.title || ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full bg-transparent border-b border-dm-border focus:border-dm-accent outline-none font-display text-xl text-dm-text-bright placeholder:text-dm-muted/70 pb-2 transition-colors"
          />

          <div>
            <span className={labelClass}>Tipo</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de nota">
              {NOTE_CATEGORIES.map((c) => {
                const active = cat.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickCategory(c.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs transition-colors",
                      active ? "border-dm-accent bg-dm-accent/15 text-dm-accent font-bold" : "border-dm-border text-dm-muted hover:text-dm-text-bright hover:border-dm-border-focus"
                    )}
                  >
                    <c.icon size={13} /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <DescriptionEditor
              id="note-content"
              label="Contenido"
              labelClassName={cn(labelClass, "mb-0")}
              value={content}
              onChange={(v) => setDraft({ ...draft, content: v })}
              placeholder="Escribe aquí… **negrita**, ## títulos, - listas, - [ ] casillas. Las tiradas como 1d20+5 se lanzan con un clic."
              textareaClassName={cn(fieldClass, "block w-full h-56 sm:h-72 resize-y min-h-32 text-sm leading-relaxed custom-scrollbar")}
              snippets={SNIPPETS}
              smartLists
              autoFocus={!!draft.id}
            />
            <div className="-mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap">
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                aria-expanded={showHelp}
                className={cn("inline-flex items-center gap-1.5 text-xs transition-colors", showHelp ? "text-dm-accent" : "text-dm-muted hover:text-dm-accent")}
              >
                <HelpCircle size={13} /> {showHelp ? "Ocultar guía de formato" : "¿Cómo dar formato?"}
              </button>
              {cat.template && !isTemplateText(content) && !content.includes(cat.template.split("\n")[0]) && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, content: `${content.replace(/\s+$/, "")}\n\n${cat.template}` })}
                  className="inline-flex items-center gap-1.5 text-xs text-dm-muted hover:text-dm-accent"
                >
                  <LayoutTemplate size={13} /> Añadir plantilla de {cat.label}
                </button>
              )}
            </div>
            {showHelp && (
              <div className="mt-3 rounded-lg border border-dm-border bg-black/25 p-3 sm:p-4 animate-in fade-in">
                <NotesHelp compact onRoll={onRoll} />
              </div>
            )}
          </div>

          <TagInput tags={draft.tags || []} onChange={(tags) => setDraft({ ...draft, tags })} suggestions={allTags} />

          <div>
            <span className={cn(labelClass, "flex items-center gap-1.5")}><Palette size={11} /> Color</span>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((c) => {
                const active = (draft.color || DEFAULT_NOTE_COLOR) === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    aria-label={`Color ${c.label}`}
                    aria-pressed={active}
                    onClick={() => setDraft({ ...draft, color: c.value })}
                    style={{ background: noteBackground(c.value, 45), boxShadow: active ? `0 0 0 2px var(--theme-bg), 0 0 0 4px ${noteTint(c.value)}` : undefined }}
                    className={cn("w-8 h-8 rounded-full border border-white/10 transition-transform hover:scale-110", active && "scale-110")}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-t border-white/5 bg-black/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="hidden sm:inline text-[11px] text-dm-muted">
            <kbd className="border border-dm-border rounded px-1">Ctrl</kbd> + <kbd className="border border-dm-border rounded px-1">Enter</kbd> guardar
          </span>
          <button type="button" onClick={onClose} className="ml-auto px-4 py-2 text-xs uppercase tracking-widest text-dm-muted hover:text-dm-text-bright">Cancelar</button>
          <button type="submit" disabled={!canSave} className="px-6 py-2 bg-dm-accent text-dm-bg-darker text-xs font-bold uppercase tracking-widest hover:bg-dm-accent-hover disabled:opacity-40 disabled:pointer-events-none transition-colors">
            Guardar
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (tags: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setText("");
    setActive(-1);
  };
  // Themed suggestion list (the native <datalist> popup can't follow the theme).
  const q = text.trim().replace(/^#+/, "").toLowerCase();
  const shown = suggestions.filter((s) => !tags.includes(s) && s.includes(q));
  const listOpen = open && shown.length > 0;
  const pos = useListPosition(listOpen, boxRef, shown.length * 36);
  useModalLayer(listOpen, () => setOpen(false));
  useOutsidePress(listOpen, [boxRef, listRef], () => setOpen(false));
  useEffect(() => {
    if (listOpen && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, listOpen]);

  return (
    <div>
      <label htmlFor="note-tags" className={cn(labelClass, "flex items-center gap-1.5")}><Tag size={11} /> Etiquetas</label>
      <div ref={boxRef} className="flex flex-wrap items-center gap-1.5 min-h-10 px-2 py-1.5 bg-black/30 border border-dm-border focus-within:border-dm-accent transition-colors">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-dm-accent/15 text-dm-accent text-xs">
            #{t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Quitar #${t}`} className="p-0.5 rounded-full hover:bg-dm-accent/20"><X size={11} /></button>
          </span>
        ))}
        <input
          id="note-tags"
          role="combobox"
          aria-expanded={listOpen}
          aria-autocomplete="list"
          aria-controls="note-tags-list"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,\s]$/.test(v) && v.trim()) add(v.slice(0, -1));
            else {
              setText(v);
              setActive(-1);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && shown.length) {
              e.preventDefault();
              setOpen(true);
              const d = e.key === "ArrowDown" ? 1 : -1;
              setActive((a) => (a + d + shown.length) % shown.length);
            } else if (e.key === "Enter" && listOpen && active >= 0 && shown[active]) {
              e.preventDefault();
              add(shown[active]);
            } else if (e.key === "Enter" && text.trim()) {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && tags.length) onChange(tags.slice(0, -1));
            else if (e.key === "Tab") setOpen(false);
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={tags.length ? "" : "villano, ciudad, sesión-3…"}
          className="flex-1 min-w-24 bg-transparent text-sm text-dm-text-bright placeholder:text-dm-muted outline-none"
        />
      </div>
      {listOpen && pos &&
        createPortal(
          <ul
            ref={listRef}
            id="note-tags-list"
            role="listbox"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: Math.min(pos.minWidth, 320), maxWidth: pos.maxWidth, maxHeight: LIST_MAX_HEIGHT }}
            className={listClass}
          >
            {shown.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={false}
                onPointerDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => add(s)}
                onPointerEnter={() => setActive(i)}
                className={optionClass(i === active, false)}
              >
                <Tag size={12} className="text-dm-muted shrink-0" />
                <span className="flex-1 truncate">#{s}</span>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}

