import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useModalLayer } from "./Modal";
import { LIST_MAX_HEIGHT, groupClass, listClass, optionClass, useListPosition, useOutsidePress } from "./popupList";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Options with the same group are listed together under that heading (keep them consecutive). */
  group?: string;
  /** Color dot before the label (rarities...). */
  color?: string;
  /** Nesting level, shown as left padding in the list only (tree pickers). */
  indent?: number;
  disabled?: boolean;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  id?: string;
  "aria-label"?: string;
  /** Text shown when no option matches the value. */
  placeholder?: string;
  /** Show the label of the empty option ("Nivel", "Tipo"...) dimmed, like a placeholder. */
  dimEmpty?: boolean;
  /** Classes for the trigger (size, background...). The list always looks the same. */
  className?: string;
  disabled?: boolean;
}

const triggerBase =
  "relative flex items-center gap-2 w-full h-10 pl-3 pr-9 bg-dm-bg border border-dm-border text-sm text-left text-dm-text-bright outline-none transition-colors hover:border-dm-border-focus focus-visible:border-dm-accent aria-expanded:border-dm-accent disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Themed replacement for <select>: same trigger look as the text fields and a list like the
 * Combobox's, instead of the browser's native popup (grey and blue on Windows). Keyboard:
 * arrows, Home/End, Enter/Space, Escape, and typing letters jumps to an option.
 */
export function Select<T extends string>({ value, onChange, options, id, placeholder = "Selecciona…", dimEmpty, className, disabled, ...rest }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];
  const pos = useListPosition(open, triggerRef, options.length * 36 + new Set(options.map((o) => o.group).filter(Boolean)).size * 28);

  useModalLayer(open, () => close());
  useOutsidePress(open, [triggerRef, listRef], () => setOpen(false));

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : firstEnabled(1, -1));
    setOpen(true);
  };
  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  };
  /** Next enabled option from `from` in direction `dir` (wrapping), or -1. */
  function firstEnabled(dir: 1 | -1, from: number) {
    for (let k = 1; k <= options.length; k++) {
      const i = (((from + dir * k) % options.length) + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return -1;
  }

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, pos]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => firstEnabled(key === "ArrowDown" ? 1 : -1, a));
    } else if (key === "Home" || key === "End") {
      e.preventDefault();
      setActive(key === "Home" ? firstEnabled(1, -1) : firstEnabled(-1, options.length));
    } else if (key === "Enter" || key === " ") {
      e.preventDefault();
      choose(active);
    } else if (key === "Tab") {
      setOpen(false);
    } else if (key.length === 1 && /\S/.test(key)) {
      // Type-ahead: letters typed in quick succession find the first option that starts with them.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + key.toLowerCase(), at: now };
      const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  const isEmpty = dimEmpty && value === ("" as T);

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={rest["aria-label"]}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(triggerBase, className)}
      >
        {selected?.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} aria-hidden />}
        <span className={cn("flex-1 min-w-0 truncate", (isEmpty || !selected) && "text-dm-muted")}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 text-dm-muted transition-transform", open && "rotate-180 text-dm-accent")} aria-hidden />
      </button>

      {open && pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={rest["aria-label"]}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: Math.max(pos.minWidth, 192), maxWidth: pos.maxWidth, maxHeight: LIST_MAX_HEIGHT }}
            className={listClass}
          >
            {options.map((o, i) => {
              const header = o.group && o.group !== options[i - 1]?.group;
              return (
                <React.Fragment key={o.value}>
                  {header && (
                    <li role="presentation" className={cn(groupClass, i > 0 && "mt-1 border-t border-dm-border/60")}>
                      {o.group}
                    </li>
                  )}
                  <li
                    role="option"
                    data-index={i}
                    aria-selected={i === selectedIndex}
                    aria-disabled={o.disabled || undefined}
                    onPointerDown={(e) => e.preventDefault()} // keep focus on the trigger
                    onClick={() => choose(i)}
                    onPointerEnter={() => !o.disabled && setActive(i)}
                    className={cn(optionClass(i === active, i === selectedIndex, o.disabled), o.group && "pl-5")}
                    style={o.indent ? { paddingLeft: `calc(${o.group ? "1.25rem" : "0.75rem"} + ${Math.min(o.indent, 8) * 0.9}rem)` } : undefined}
                  >
                    {!!o.indent && <span className="text-dm-muted-alt shrink-0" aria-hidden>↳</span>}
                    {o.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} aria-hidden />}
                    <span className="flex-1 truncate">{o.label}</span>
                    {i === selectedIndex && <Check size={14} className="shrink-0" />}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
