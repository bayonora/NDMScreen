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

/** Accepts either a bare array or a full export object containing `key`. */
export function arrayOrKey(key: string, isValid: (item: any) => boolean = (i) => !!i && typeof i === "object" && "id" in i) {
  return (json: any) => {
    const list = Array.isArray(json) ? json : Array.isArray(json?.[key]) ? json[key] : null;
    return list && list.every(isValid) ? list : null;
  };
}
