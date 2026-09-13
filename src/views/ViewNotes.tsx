import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useState, useRef } from "react";
import { useStore, actions, store } from "../store/useStore";
import { Plus, X, Download, Upload, Palette, Edit2, Trash2, StickyNote } from "lucide-react";
import { Note } from "../types";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImportModal } from "../components/ImportModal";

const COLORS = [
  "bg-[#2a2420]", // Default Dark
  "bg-[#3a2020]", // Dark Red
  "bg-[#203a20]", // Dark Green
  "bg-[#202a3a]", // Dark Blue
  "bg-[#3a3520]", // Dark Yellow/Gold
  "bg-[#3a2035]", // Dark Purple
];

export function ViewNotes() {
  const { notes, uiState } = useStore();
  const editingNote = uiState?.draftNote || null;
  const setEditingNote = (note: Partial<Note> | null) => actions.updateUI({ draftNote: note });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    if (editingNote.id) {
      actions.updateNote(editingNote.id, editingNote as Note);
    } else {
      actions.addNote(editingNote as Note);
    }
    setEditingNote(null);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes || []));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ndms_notas.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setPendingImport(imported);
        } else if (imported && imported.notes && Array.isArray(imported.notes)) {
          setPendingImport(imported.notes);
        } else {
          alert("El archivo no parece contener notas válidas.");
        }
      } catch (err) {
        alert("Archivo de notas inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    if (mode === "overwrite") {
      store.setState({ notes: pendingImport });
    } else {
      store.setState({ notes: [...(store.getState().notes || []), ...pendingImport] });
    }
    setPendingImport(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden relative">
      {/* HEADER: Matches standard top bar */}
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex justify-between items-center z-20 relative gap-4">
        <h2 className="text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2 truncate">
          <StickyNote className="text-dm-accent shrink-0" size={20} />
          <span className="hidden sm:inline">Bloc de Notas</span><span className="sm:hidden">Notas</span>
        </h2>
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0"
            title="Importar Notas">
            <Download size={18} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0"
            title="Exportar Notas">
            <Upload size={18} />
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
          
          <button
            onClick={() => setEditingNote({ id: "", title: "", content: "", color: COLORS[0] })}
            className="flex items-center space-x-2 px-4 py-2 bg-dm-accent text-black hover:bg-white transition-colors uppercase tracking-wider text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Plus size={16} />
            <span>Nueva Nota</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-24 text-dm-text">
        <>
          <SortableGrid
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full"
          items={notes || []}
          onReorder={(newNotes) => actions.reorderNotes(newNotes)}
          renderItem={(note) => (
            <div
              className={`${note.color || COLORS[0]} active:scale-[0.98] border border-dm-border p-4 flex flex-col shadow-lg hover:border-dm-accent transition-colors group relative`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg text-dm-accent font-bold truncate pr-6">{note.title || "Sin título"}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(note.id);
                  }}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap flex-1 cursor-pointer line-clamp-6" onClick={() => setViewingNote(note)}>
                {note.content}
              </p>
            </div>
          )}
        />
          {(!notes || notes.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border">
              <p>No hay notas guardadas.</p>
              <p className="text-sm mt-2">Usa "Nueva Nota" para crear un recordatorio o tarjeta.</p>
            </div>
          )}
          </>
      </div>

      
      {viewingNote && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 sm:p-6 transition-all" onClick={() => setViewingNote(null)}>
          <div
            className={`${viewingNote.color || COLORS[0]} border border-dm-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl shadow-black custom-scrollbar flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
               <h2 className="text-2xl text-dm-accent font-bold pr-4">{viewingNote.title || "Sin título"}</h2>
               <div className="flex gap-2 shrink-0">
                 <button onClick={() => { setEditingNote(viewingNote); setViewingNote(null); }} className="text-dm-muted hover:text-dm-accent transition-colors p-2 bg-black/20 rounded border border-transparent hover:border-dm-border" title="Editar">
                   <Edit2 size={18} />
                 </button>
                 <button onClick={() => { setDeleteId(viewingNote.id); setViewingNote(null); }} className="text-dm-muted hover:text-dm-danger transition-colors p-2 bg-black/20 rounded border border-transparent hover:border-dm-border" title="Eliminar">
                   <Trash2 size={18} />
                 </button>
                 <button onClick={() => setViewingNote(null)} className="text-dm-muted hover:text-white p-2 bg-black/20 rounded border border-transparent hover:border-dm-border" title="Cerrar">
                   <X size={18} />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 pr-4">
              <div className="text-base text-gray-200 font-serif leading-relaxed opacity-90 markdown-body">
                <Markdown 
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-dm-accent mb-4 mt-6 first:mt-0 font-sans uppercase tracking-widest" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-dm-accent mb-3 mt-5 first:mt-0 font-sans uppercase tracking-widest" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-dm-accent-hover mb-3 mt-4 first:mt-0 font-sans" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-dm-text" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-dm-accent-hover" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-dm-accent pl-4 py-1 mb-4 bg-black/20 italic" {...props} />,
                    a: ({node, ...props}) => <a className="text-dm-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                  }}
                >
                  {viewingNote.content}
                </Markdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all">
          <form
            onSubmit={handleSave}
            className={`${editingNote.color || COLORS[0]} border border-dm-border rounded-lg p-6 max-w-lg w-full relative shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col`}
          >
            <button
              type="button"
              onClick={() => setEditingNote(null)}
              className="absolute top-4 right-4 text-dm-muted hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-4 font-light">
              {editingNote.id ? "Editar Nota" : "Nueva Nota"}
            </h2>

            <input
              type="text"
              placeholder="Título de la nota"
              value={editingNote.title}
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              className="bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none"
            />
            
            <textarea
              placeholder="Escribe tu nota aquí..."
              value={editingNote.content}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              className="bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none h-48 resize-none"
              required
            />

            <div className="flex items-center mb-6 space-x-2">
              <Palette size={16} className="text-dm-muted" />
              <div className="flex space-x-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditingNote({ ...editingNote, color: c })}
                    className={`w-6 h-6 rounded-full border-2 ${editingNote.color === c ? "border-white" : "border-transparent"} ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-dm-accent text-black font-bold uppercase tracking-widest hover:bg-white transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && actions.deleteNote(deleteId)}
        title="Eliminar Nota"
        message="¿Estás seguro de que quieres eliminar esta nota de tu panel?"
      />
      <ImportModal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onMerge={() => confirmImport("merge")}
        onOverwrite={() => confirmImport("overwrite")}
      />
    </div>
  );
}
