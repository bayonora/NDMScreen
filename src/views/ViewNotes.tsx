import React, { useState } from "react";
import { useStore, actions } from "../store/useStore";
import { Plus, X, Palette, Edit2, Trash2, StickyNote } from "lucide-react";
import { Note } from "../types";
import { cn, downloadJSON } from "../lib/utils";
import { Markdown } from "../components/ui/Markdown";
import { Overlay } from "../components/ui/Modal";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";

// Stored on each note as a class name, so these literal strings must stay as they are.
const COLORS = [
  "bg-[#2a2420]", // Default Dark
  "bg-[#3a2020]", // Dark Red
  "bg-[#203a20]", // Dark Green
  "bg-[#202a3a]", // Dark Blue
  "bg-[#3a3520]", // Dark Yellow/Gold
  "bg-[#3a2035]", // Dark Purple
];

const fieldClass = "bg-black/40 border border-dm-border p-2 text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none";

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold text-dm-accent mb-4 mt-6 first:mt-0 font-sans uppercase tracking-widest" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold text-dm-accent mb-3 mt-5 first:mt-0 font-sans uppercase tracking-widest" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold text-dm-accent-hover mb-3 mt-4 first:mt-0 font-sans" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-dm-text-bright" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic text-dm-accent-hover" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-dm-accent pl-4 py-1 mb-4 bg-black/20 italic" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-dm-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
};

export function ViewNotes() {
  const notes = useStore((state) => state.notes);
  // The draft lives in the persisted UI state so an unsaved note survives a reload.
  const editingNote = useStore((state) => state.uiState.draftNote) || null;
  const setEditingNote = (note: Partial<Note> | null) => actions.updateUI({ draftNote: note });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    const { id, ...data } = editingNote;
    if (id) actions.updateNote(id, data);
    else actions.addNote({ title: "", content: "", color: COLORS[0], ...data });
    setEditingNote(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={StickyNote}
        title="Bloc de Notas"
        shortTitle="Notas"
        actions={
          <>
            <ImportExportActions
              noun="Notas"
              onExport={() => downloadJSON(notes, "ndms_notas.json")}
              parse={arrayOrKey("notes")}
              onImport={(items, mode) => actions.importCollection("notes", items, mode)}
              invalidMessage="El archivo no parece contener notas válidas."
            />
            <ToolbarButton icon={Plus} label="Nueva Nota" shortLabel="Nueva" variant="primary" showLabel="always" onClick={() => setEditingNote({ title: "", content: "", color: COLORS[0] })} />
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar pb-12 sm:pb-16 text-dm-text">
        <SortableGrid
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full"
          items={notes}
          onReorder={actions.reorderNotes}
          renderItem={(note) => (
            <div
              className={cn(note.color || COLORS[0], "border border-dm-border p-4 flex flex-col shadow-lg hover:border-dm-accent transition-colors group relative cursor-pointer active:scale-[0.98]")}
              onClick={() => setViewingNote(note)}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="text-lg text-dm-accent font-bold truncate">{note.title || "Sin título"}</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(note.id);
                  }}
                  aria-label="Eliminar nota"
                  title="Eliminar nota"
                  className="shrink-0 -mr-1 -mt-1 p-1 text-dm-muted hover:text-dm-danger can-hover:opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Rendered preview, faded out at the bottom instead of a hard cut. */}
              <div className="text-sm text-dm-text max-h-36 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)] pointer-events-none">
                <Markdown components={markdownComponents}>{note.content}</Markdown>
              </div>
            </div>
          )}
        />
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border text-center px-4">
            <p>No hay notas guardadas.</p>
            <p className="text-sm mt-2">Usa "Nueva Nota" para crear un recordatorio o tarjeta.</p>
          </div>
        )}
      </div>

      <Overlay isOpen={!!viewingNote} onClose={() => setViewingNote(null)}>
        {viewingNote && (
          <div
            role="dialog"
            aria-modal="true"
            className={cn(viewingNote.color || COLORS[0], "relative border border-dm-border p-4 sm:p-6 max-w-2xl w-full max-h-full sm:max-h-[90vh] flex flex-col shadow-2xl shadow-black animate-in fade-in zoom-in-95")}
          >
            <div className="flex justify-between items-start gap-2 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl text-dm-accent font-bold break-words min-w-0">{viewingNote.title || "Sin título"}</h2>
              <div className="flex gap-1 sm:gap-2 shrink-0">
                <NoteAction label="Editar" onClick={() => { setEditingNote(viewingNote); setViewingNote(null); }}><Edit2 size={18} /></NoteAction>
                <NoteAction label="Eliminar" danger onClick={() => { setDeleteId(viewingNote.id); setViewingNote(null); }}><Trash2 size={18} /></NoteAction>
                <NoteAction label="Cerrar" onClick={() => setViewingNote(null)}><X size={18} /></NoteAction>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 text-base text-dm-text font-serif leading-relaxed select-text">
              <Markdown components={markdownComponents}>{viewingNote.content}</Markdown>
            </div>
          </div>
        )}
      </Overlay>

      <Overlay isOpen={!!editingNote} onClose={() => setEditingNote(null)} closeOnBackdrop={false}>
        {editingNote && (
          <form
            onSubmit={handleSave}
            className={cn(editingNote.color || COLORS[0], "relative border border-dm-border rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-full flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.4)]")}
          >
            <button type="button" onClick={() => setEditingNote(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright">
              <X size={20} />
            </button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-4 font-light pr-8">
              {editingNote.id ? "Editar Nota" : "Nueva Nota"}
            </h2>

            <input
              type="text"
              placeholder="Título de la nota"
              aria-label="Título"
              value={editingNote.title || ""}
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              className={cn(fieldClass, "mb-4")}
            />

            <textarea
              placeholder="Escribe tu nota aquí... (admite Markdown: **negrita**, # títulos, - listas)"
              aria-label="Contenido"
              value={editingNote.content || ""}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              className={cn(fieldClass, "mb-4 h-48 sm:h-64 resize-y min-h-32")}
              required
            />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Palette size={16} className="text-dm-muted" />
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label="Color de la nota"
                    aria-pressed={editingNote.color === c}
                    onClick={() => setEditingNote({ ...editingNote, color: c })}
                    className={cn("w-7 h-7 rounded-full border-2", c, editingNote.color === c ? "border-dm-text-bright" : "border-transparent")}
                  />
                ))}
              </div>
              <button type="submit" className="px-6 py-2 bg-dm-accent text-dm-bg-darker font-bold uppercase tracking-widest hover:bg-dm-accent-hover transition-colors">
                Guardar
              </button>
            </div>
          </form>
        )}
      </Overlay>

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

function NoteAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("text-dm-muted transition-colors p-2 bg-black/20 rounded border border-transparent hover:border-dm-border", danger ? "hover:text-dm-danger" : "hover:text-dm-accent")}
    >
      {children}
    </button>
  );
}
