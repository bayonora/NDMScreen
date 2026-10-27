import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn, normalizeSearchText } from "../../lib/utils";
import { useModalLayer } from "./Modal";
import { LIST_MAX_HEIGHT, listClass, optionClass, useListPosition, useOutsidePress } from "./popupList";

export interface ComboboxOption {
  value: string;
  /** Optional color dot shown before the option (e.g. rarity colors). */
  color?: string;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Classes for the text input (the field keeps free text: options are only suggestions). */
  inputClassName?: string;
  className?: string;
  /** Form attributes passed to the input, so it works inside uncontrolled forms. */
  name?: string;
  pattern?: string;
  title?: string;
  required?: boolean;
}

/**
 * Text field with a themed suggestion list right under it. Replaces <datalist>, whose native popup
 * the browser places and styles on its own. The list is portaled to <body> so dialogs' scroll and
 * transforms never clip or shift it.
 */
export function Combobox({ id, value, onChange, options, placeholder, inputClassName, className, name, pattern, title, required }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // As a modal layer, Escape closes the list without closing the dialog underneath.
  useModalLayer(open, () => setOpen(false));
  useOutsidePress(open, [wrapRef, listRef], () => setOpen(false));

  const exact = options.some((o) => o.value.toLowerCase() === value.trim().toLowerCase());
  const q = normalizeSearchText(value.trim());
  // While the value is one of the options, show them all so it's easy to switch.
  const shown = exact || !q ? options : options.filter((o) => normalizeSearchText(o.value).includes(q));
  const pos = useListPosition(open, inputRef, shown.length * 36);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (shown.length ? (a + delta + shown.length) % shown.length : -1));
    } else if (e.key === "Enter" && open && active >= 0 && shown[active]) {
      e.preventDefault(); // pick the option instead of submitting the form
      choose(shown[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const selectedIndex = shown.findIndex((o) => o.value.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        pattern={pattern}
        title={title}
        required={required}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-list` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(inputClassName, "pr-9")}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "Cerrar sugerencias" : "Ver sugerencias"}
        onClick={() => {
          setOpen((o) => !o);
          inputRef.current?.focus();
        }}
        className="absolute right-0 top-0 h-full px-2.5 flex items-center text-dm-muted hover:text-dm-accent"
      >
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180 text-dm-accent")} />
      </button>

      {open && pos && shown.length > 0 &&
        createPortal(
          <ul
            ref={listRef}
            id={id ? `${id}-list` : undefined}
            role="listbox"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.minWidth, maxWidth: pos.maxWidth, maxHeight: LIST_MAX_HEIGHT }}
            className={listClass}
          >
            {shown.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={i === selectedIndex}
                onPointerDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => choose(o.value)}
                onPointerEnter={() => setActive(i)}
                className={optionClass(i === active, i === selectedIndex)}
              >
                {o.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} aria-hidden />}
                <span className="flex-1 truncate">{o.value}</span>
                {i === selectedIndex && <Check size={14} className="shrink-0" />}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
