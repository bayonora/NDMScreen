import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { ToolbarButton } from "./ui/ViewHeader";
import { ImportModal } from "./ImportModal";
import { readFileAsText } from "../lib/utils";

interface ImportExportActionsProps<T> {
  /** What is being imported/exported, for button labels (e.g. "Notas"). */
  noun: string;
  onExport: () => void;
  /** Extracts this section's data from a parsed JSON file, or returns null if the file doesn't fit. */
  parse: (json: any) => T | null;
  onImport: (data: T, mode: "merge" | "overwrite") => void;
  invalidMessage?: string;
}

/** Import + export buttons for a section, including the file picker and the merge/overwrite dialog. */
export function ImportExportActions<T>({ noun, onExport, parse, onImport, invalidMessage }: ImportExportActionsProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<T | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = parse(JSON.parse(await readFileAsText(file)));
      if (data) setPending(data);
      else alert(invalidMessage || `El archivo no contiene ${noun.toLowerCase()} válidos.`);
    } catch {
      alert("Archivo inválido: no es un JSON correcto.");
    }
  };

  return (
    <>
      <input type="file" accept=".json,application/json" className="hidden" ref={inputRef} onChange={handleFile} />
      <ToolbarButton icon={Download} label={`Importar ${noun}`} onClick={() => inputRef.current?.click()} />
      <ToolbarButton icon={Upload} label={`Exportar ${noun}`} onClick={onExport} />
      <ImportModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onMerge={() => pending && onImport(pending, "merge")}
        onOverwrite={() => pending && onImport(pending, "overwrite")}
      />
    </>
  );
}

const isObj = (i: any) => !!i && typeof i === "object" && !Array.isArray(i);

/**
 * Loose shape checks for each section's entries, so a file from another section (shops imported
 * in Notas) is rejected instead of turning into empty entries. Missing fields are fine: the store
 * fills them in when importing (see lib/sanitize).
 */
export const looksLike = {
  note: (i: any) => isObj(i) && ("content" in i || "title" in i) && !("status" in i || "ownerName" in i),
  shop: (i: any) => isObj(i) && "ownerName" in i,
  customItem: (i: any) => isObj(i) && "name" in i && !("stats" in i || "ownerName" in i || "items" in i || "entries" in i),
  lootTable: (i: any) => isObj(i) && (Array.isArray(i.items) || Array.isArray(i.entries)) && !("ownerName" in i),
  quest: (i: any) => isObj(i) && "title" in i && !("content" in i),
};

/** Accepts either a bare array or a full export object containing `key`. */
export function arrayOrKey(key: string, isValid: (item: any) => boolean = (i) => !!i && typeof i === "object" && "id" in i) {
  return (json: any) => {
    const list = Array.isArray(json) ? json : Array.isArray(json?.[key]) ? json[key] : null;
    return list && list.every(isValid) ? list : null;
  };
}
