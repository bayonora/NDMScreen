import React, { useRef, useState } from "react";
import { Bold, Italic, Table2, Eye, PenLine, Plus, X, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Markdown } from "./ui/Markdown";
import { Overlay } from "./ui/Modal";
import { TableData, emptyTable, findTableAt, insertBlock, tableToMarkdown } from "../lib/markdownTable";

interface DescriptionEditorProps {
  id?: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  labelClassName?: string;
  textareaClassName?: string;
  /** Extra toolbar buttons that insert text; `lineStart` puts it on a line of its own ("- [ ] "). */
  snippets?: { icon: React.ElementType; label: string; text: string; lineStart?: boolean }[];
  /** Enter inside a list continues it ("- ", "1. ", "- [ ] "); Enter on an empty item ends it. */
  smartLists?: boolean;
  autoFocus?: boolean;
}

/**
 * Markdown textarea with a small, muted toolbar: bold, italic, a grid editor for tables and a
 * preview. Nobody has to type "| --- |" by hand.
 */
export function DescriptionEditor({ id, label, value, onChange, placeholder, labelClassName, textareaClassName, snippets, smartLists, autoFocus }: DescriptionEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [table, setTable] = useState<{ data: TableData; start: number; end: number; editing: boolean } | null>(null);

  const restoreCursor = (pos: number, end = pos) => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, end);
    });
  };

  const wrap = (mark: string, sample: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || sample;
    onChange(value.slice(0, start) + mark + selected + mark + value.slice(end));
    restoreCursor(start + mark.length, start + mark.length + selected.length);
  };

  const insert = (snippet: string, lineStart?: boolean) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    if (!lineStart) {
      onChange(value.slice(0, start) + snippet + value.slice(end));
      return restoreCursor(start + snippet.length);
    }
    const lineBegin = value.lastIndexOf("\n", start - 1) + 1;
    const nl = value.indexOf("\n", start);
    const lineEnd = nl === -1 ? value.length : nl;
    if (value.slice(lineBegin, lineEnd).trim()) {
      onChange(value.slice(0, lineEnd) + "\n" + snippet + value.slice(lineEnd));
      restoreCursor(lineEnd + 1 + snippet.length);
    } else {
      onChange(value.slice(0, lineBegin) + snippet + value.slice(lineEnd));
      restoreCursor(lineBegin + snippet.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!smartLists || e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const lineBegin = value.lastIndexOf("\n", pos - 1) + 1;
    const line = value.slice(lineBegin, pos);
    const m = line.match(/^(\s*)([-*+]|(\d+)([.)]))[ \t]+(\[[ xX]\][ \t]+)?/);
    if (!m) return;
    e.preventDefault();
    if (!line.slice(m[0].length).trim()) {
      // Empty item: end the list.
      onChange(value.slice(0, lineBegin) + value.slice(pos));
      return restoreCursor(lineBegin);
    }
    const bullet = m[3] ? `${Number(m[3]) + 1}${m[4]}` : m[2];
    const next = `\n${m[1]}${bullet} ${m[5] ? "[ ] " : ""}`;
    onChange(value.slice(0, pos) + next + value.slice(pos));
    restoreCursor(pos + next.length);
  };

  const openTable = () => {
    setPreview(false);
    const cursor = ref.current?.selectionStart ?? value.length;
    const found = findTableAt(value, cursor);
    if (found) setTable({ data: found.data, start: found.start, end: found.end, editing: true });
    else setTable({ data: emptyTable(), start: cursor, end: ref.current?.selectionEnd ?? cursor, editing: false });
  };

  const saveTable = (data: TableData) => {
    if (!table) return;
    const { text, cursor } = insertBlock(value, table.start, table.end, tableToMarkdown(data));
    onChange(text);
    setTable(null);
    restoreCursor(cursor);
  };

  const removeTable = () => {
    if (!table) return;
    const { text, cursor } = insertBlock(value, table.start, table.end, "");
    onChange(text.replace(/\n{3,}/g, "\n\n"));
    setTable(null);
    restoreCursor(Math.min(cursor, text.length));
  };

  const tool = "p-1.5 rounded-sm text-dm-muted hover:text-dm-accent hover:bg-dm-accent/10 transition-colors disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="mb-4">
      <div className="flex items-end justify-between gap-2 mb-1">
        <label className={cn(labelClassName, "mb-0")} htmlFor={id}>{label}</label>
        <div className="flex items-center gap-0.5 -mb-0.5" role="toolbar" aria-label="Formato de la descripción">
          <button type="button" className={tool} title="Negrita" aria-label="Negrita" disabled={preview} onClick={() => wrap("**", "texto")}><Bold size={14} /></button>
          <button type="button" className={tool} title="Cursiva" aria-label="Cursiva" disabled={preview} onClick={() => wrap("*", "texto")}><Italic size={14} /></button>
          <button type="button" className={tool} title="Insertar o editar una tabla (pon el cursor dentro de una tabla para editarla)" aria-label="Tabla" onClick={openTable}><Table2 size={14} /></button>
          {snippets?.map(({ icon: Icon, label: snippetLabel, text, lineStart }) => (
            <button key={snippetLabel} type="button" className={tool} title={snippetLabel} aria-label={snippetLabel} disabled={preview} onClick={() => insert(text, lineStart)}>
              <Icon size={14} />
            </button>
          ))}
          <span className="w-px h-4 bg-dm-border mx-1" aria-hidden />
          <button
            type="button"
            className={cn(tool, preview && "text-dm-accent bg-dm-accent/10")}
            title={preview ? "Volver a editar" : "Vista previa"}
            aria-label={preview ? "Volver a editar" : "Vista previa"}
            aria-pressed={preview}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <PenLine size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {preview ? (
        <div
          className={cn(
            textareaClassName,
            "mb-0 overflow-y-auto custom-scrollbar text-sm leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-dm-text-bright",
            "[&_table]:block [&_table]:overflow-x-auto [&_table]:my-3 [&_table]:text-xs [&_table]:border [&_table]:border-dm-border [&_th]:text-dm-accent [&_th]:text-left [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-dm-border"
          )}
          onDoubleClick={() => setPreview(false)}
          title="Doble clic para editar"
        >
          {value.trim() ? <Markdown units>{value}</Markdown> : <p className="text-dm-muted italic">Nada que mostrar todavía.</p>}
        </div>
      ) : (
        <textarea ref={ref} id={id} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} autoFocus={autoFocus} className={cn(textareaClassName, "mb-0")} placeholder={placeholder} />
      )}

      <TableEditorModal
        initial={table?.data ?? null}
        editing={!!table?.editing}
        onCancel={() => setTable(null)}
        onSave={saveTable}
        onRemove={removeTable}
      />
    </div>
  );
}

const cellClass = "w-full min-w-28 bg-black/40 border border-dm-border px-2 py-1.5 text-sm text-dm-text-bright placeholder:text-dm-muted-alt focus:border-dm-accent outline-none";

function TableEditorModal({ initial, editing, onCancel, onSave, onRemove }: {
  initial: TableData | null;
  editing: boolean;
  onCancel: () => void;
  onSave: (data: TableData) => void;
  onRemove: () => void;
}) {
  const [data, setData] = useState<TableData | null>(initial);
  const [source, setSource] = useState<TableData | null>(initial);
  // Reset the grid each time the dialog opens with a new table.
  if (initial !== source) {
    setSource(initial);
    setData(initial);
  }
  if (!data) return <Overlay isOpen={false} onClose={onCancel}>{null}</Overlay>;

  const cols = data.header.length;
  const setHeader = (c: number, v: string) => setData({ ...data, header: data.header.map((h, i) => (i === c ? v : h)) });
  const setCell = (r: number, c: number, v: string) =>
    setData({ ...data, rows: data.rows.map((row, ri) => (ri === r ? row.map((x, ci) => (ci === c ? v : x)) : row)) });
  const addRow = () => setData({ ...data, rows: [...data.rows, Array(cols).fill("")] });
  const addCol = () => setData({ ...data, header: [...data.header, ""], rows: data.rows.map((r) => [...r, ""]) });
  const removeRow = (r: number) => setData({ ...data, rows: data.rows.filter((_, i) => i !== r) });
  const removeCol = (c: number) =>
    cols > 1 && setData({ ...data, header: data.header.filter((_, i) => i !== c), rows: data.rows.map((r) => r.filter((_, i) => i !== c)) });
  const isEmpty = data.header.every((h) => !h.trim()) && data.rows.every((r) => r.every((c) => !c.trim()));

  return (
    <Overlay isOpen onClose={onCancel} closeOnBackdrop={false} zIndex="z-[60]">
      <div role="dialog" aria-modal="true" aria-label="Editor de tabla" className="relative bg-dm-bg/95 border border-dm-accent/20 rounded-xl w-full max-w-2xl max-h-full sm:max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-4 pb-3 border-b border-dm-accent/10">
          <h2 className="text-lg text-dm-accent tracking-widest uppercase font-light">{editing ? "Editar tabla" : "Nueva tabla"}</h2>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1" htmlFor="table-title">Título (opcional)</label>
            <input id="table-title" type="text" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} className={cn(cellClass, "max-w-sm")} placeholder="Ej. Pociones de curación" />
          </div>

          <div className="overflow-x-auto custom-scrollbar pb-1">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  {data.header.map((h, c) => (
                    <th key={c} className="align-bottom">
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeCol(c)} disabled={cols <= 1} title="Quitar columna" aria-label={`Quitar columna ${c + 1}`} className="p-0.5 text-dm-muted-alt hover:text-dm-danger disabled:opacity-0">
                          <X size={12} />
                        </button>
                      </div>
                      <input value={h} onChange={(e) => setHeader(c, e.target.value)} placeholder={`Columna ${c + 1}`} aria-label={`Encabezado de la columna ${c + 1}`} className={cn(cellClass, "font-bold text-dm-accent border-dm-accent/40")} />
                    </th>
                  ))}
                  <th className="align-bottom">
                    <button type="button" onClick={addCol} title="Añadir columna" aria-label="Añadir columna" className="h-[34px] px-2 border border-dashed border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent">
                      <Plus size={14} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>
                        <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} aria-label={`Fila ${r + 1}, columna ${c + 1}`} className={cellClass} />
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={() => removeRow(r)} title="Quitar fila" aria-label={`Quitar fila ${r + 1}`} className="p-1.5 text-dm-muted-alt hover:text-dm-danger">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-dm-border text-xs uppercase tracking-wider text-dm-muted hover:text-dm-accent hover:border-dm-accent">
            <Plus size={14} /> Añadir fila
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-t border-dm-border">
          {editing && (
            <button type="button" onClick={onRemove} className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider text-dm-muted hover:text-dm-danger">
              <Trash2 size={14} /> Quitar tabla
            </button>
          )}
          <button type="button" onClick={onCancel} className="ml-auto px-4 py-2 text-xs uppercase tracking-wider text-dm-muted hover:text-dm-text-bright">Cancelar</button>
          <button
            type="button"
            disabled={isEmpty}
            onClick={() => onSave(data)}
            className="px-4 py-2 bg-dm-accent text-dm-bg-darker hover:bg-dm-accent-hover disabled:opacity-50 uppercase tracking-wider font-bold text-xs"
          >
            {editing ? "Guardar tabla" : "Insertar tabla"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
