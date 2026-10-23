import React, { createContext, useContext, useMemo } from "react";
import { Check, Dices } from "lucide-react";
import { cn } from "../lib/utils";
import { Markdown } from "./ui/Markdown";

/**
 * Markdown for notes: dice notation ("1d20+5") becomes a roll button and "- [ ]" items become
 * checkboxes that can be ticked without opening the editor.
 */

const TaskContext = createContext<{ checked: boolean; onToggle?: () => void }>({ checked: false });

function DiceChip({ notation, onRoll }: { notation: string; onRoll?: (n: string) => void }) {
  const cls = "inline-flex items-center gap-1 px-1.5 mx-0.5 rounded border border-dm-accent/40 bg-dm-accent/10 text-dm-accent font-sans text-[0.88em] font-semibold leading-snug align-baseline whitespace-nowrap";
  if (!onRoll) return <span className={cls}><Dices size={11} className="shrink-0" />{notation}</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onRoll(notation); }}
      title={`Tirar ${notation}`}
      className={cn(cls, "hover:bg-dm-accent hover:text-dm-bg-darker transition-colors active:scale-95")}
    >
      <Dices size={11} className="shrink-0" />{notation}
    </button>
  );
}

function TaskCheckbox() {
  const { checked, onToggle } = useContext(TaskContext);
  const box = cn(
    "absolute left-0 top-[0.3em] w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors",
    checked ? "bg-dm-accent border-dm-accent text-dm-bg-darker" : "border-dm-muted bg-black/20"
  );
  if (!onToggle) return <span className={box} aria-hidden>{checked && <Check size={12} strokeWidth={3} />}</span>;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Desmarcar" : "Marcar"}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={cn(box, "hover:border-dm-accent cursor-pointer")}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

// The note's source and handlers reach the markdown pieces through context, so the components
// object below stays the same between renders and the rendered nodes aren't remounted.
type NoteMdOptions = { content: string; onRoll?: (n: string) => void; onToggleTask?: (offset: number) => void };
const NoteMdContext = createContext<NoteMdOptions>({ content: "" });

export function NoteMarkdown(props: NoteMdOptions) {
  const value = useMemo(() => props, [props.content, props.onRoll, props.onToggleTask]);
  return (
    <NoteMdContext.Provider value={value}>
      <Markdown dice components={MD_COMPONENTS}>{props.content}</Markdown>
    </NoteMdContext.Provider>
  );
}

function TaskItem({ node, className, children, ...props }: any) {
  const { content, onToggleTask } = useContext(NoteMdContext);
  if (!className?.includes("task-list-item")) return <li className="pl-1" {...props}>{children}</li>;
  const offset: number | undefined = node?.position?.start?.offset;
  const m = offset != null ? content.slice(offset).match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\]/) : null;
  const checked = !!m && m[1] !== " ";
  return (
    <TaskContext.Provider value={{ checked, onToggle: onToggleTask && offset != null ? () => onToggleTask(offset) : undefined }}>
      <li className={cn("relative pl-6 list-none transition-colors", checked && "text-dm-muted line-through decoration-dm-muted/60")} {...props}>{children}</li>
    </TaskContext.Provider>
  );
}

function DiceSpan({ node, children, ...props }: any) {
  const { onRoll } = useContext(NoteMdContext);
  const dice = node?.properties?.dataDice;
  if (typeof dice === "string") return <DiceChip notation={dice} onRoll={onRoll} />;
  return <span {...props}>{children}</span>;
}

const MD_COMPONENTS = {
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0" {...props} />,
  ul: ({ node, className, ...props }: any) => (
    <ul className={cn("mb-3 last:mb-0 space-y-1", className?.includes("contains-task-list") ? "list-none pl-0" : "list-disc pl-5 marker:text-dm-muted")} {...props} />
  ),
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1 marker:text-dm-muted" {...props} />,
  li: TaskItem,
  input: ({ node, ...props }: any) => (props.type === "checkbox" ? <TaskCheckbox /> : <input {...props} />),
  span: DiceSpan,
  h1: ({ node, ...props }: any) => <h1 className="text-xl font-display font-bold text-dm-accent mb-3 mt-5 first:mt-0 tracking-wide" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-lg font-display font-bold text-dm-accent mb-2 mt-5 first:mt-0 tracking-wide border-b border-dm-border/60 pb-1" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-bold text-dm-accent-hover mb-2 mt-4 first:mt-0" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-dm-text-bright" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic text-dm-accent-hover" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-dm-accent pl-3 py-1 mb-3 bg-black/20 italic text-dm-text-muted" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-dm-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer" onClick={(e: React.MouseEvent) => e.stopPropagation()} {...props} />,
  hr: () => <hr className="my-4 border-dm-border" />,
  code: ({ node, ...props }: any) => <code className="px-1 py-0.5 rounded bg-black/30 text-[0.9em] text-dm-text-bright" {...props} />,
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto mb-3"><table className="text-sm border border-dm-border w-full [&_th]:text-dm-accent [&_th]:text-left [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-dm-border" {...props} /></div>
  ),
};
