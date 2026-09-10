import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-[10px] font-bold text-[#c1a063] uppercase tracking-widest">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "flex h-10 w-full bg-[#1e1a17] border border-[#3a302a] px-3 py-2 text-sm text-[#f5f2ed] placeholder:text-[#8b7355] placeholder:italic focus:outline-none focus:border-[#c1a063] disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [ref]
    );

    const [menuPos, setMenuPos] = React.useState<{x: number, y: number} | null>(null);

    const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = internalRef.current;
      if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
        e.preventDefault();
        
        let x = e.clientX;
        let y = e.clientY;
        
        if (x + 160 > window.innerWidth) x -= 160;
        if (y + 220 > window.innerHeight) y -= 220;
        
        setMenuPos({ x, y });
      } else {
        setMenuPos(null);
      }
    };

    React.useEffect(() => {
      const closeMenu = () => setMenuPos(null);
      if (menuPos) {
        document.addEventListener("click", closeMenu);
        document.addEventListener("scroll", closeMenu, true);
      }
      return () => {
        document.removeEventListener("click", closeMenu);
        document.removeEventListener("scroll", closeMenu, true);
      };
    }, [menuPos]);

    const applyFormat = (prefix: string, suffix: string = prefix) => {
      const textarea = internalRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return;

      const value = textarea.value;
      const selected = value.slice(start, end);
      const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(textarea, newValue);

      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    };

    return (
      <div className="flex flex-col gap-1 w-full relative">
        {label && (
          <label htmlFor={inputId} className="text-[10px] font-bold text-[#c1a063] uppercase tracking-widest">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={setRefs}
          className={cn(
            "flex min-h-[80px] w-full bg-[#1e1a17] border border-[#3a302a] px-3 py-2 text-sm text-[#f5f2ed] placeholder:text-[#8b7355] placeholder:italic focus:outline-none focus:border-[#c1a063] disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            className
          )}
          {...props}
          onContextMenu={(e) => {
            handleContextMenu(e);
            if (props.onContextMenu) props.onContextMenu(e);
          }}
        />
        {menuPos && (
          <div 
            className="fixed z-[9999] bg-[#161311] border border-[#c1a063] shadow-lg rounded-sm py-1 flex flex-col w-40 text-sm overflow-hidden"
            style={{ top: menuPos.y, left: menuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => applyFormat('**')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors"><strong className="font-bold">Negrita</strong> (**)</button>
            <button type="button" onClick={() => applyFormat('*')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors"><em className="italic">Cursiva</em> (*)</button>
            <button type="button" onClick={() => applyFormat('~~')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors"><span className="line-through">Tachado</span> (~~)</button>
            <div className="h-px bg-[#3a302a] w-full my-1"></div>
            <button type="button" onClick={() => applyFormat('# ', '')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors">Título (#)</button>
            <button type="button" onClick={() => applyFormat('- ', '')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors">Lista (-)</button>
            <button type="button" onClick={() => applyFormat('> ', '')} className="text-left px-4 py-2 hover:bg-[#3a302a] text-[#e6e2da] hover:text-[#c1a063] transition-colors">Cita (&gt;)</button>
          </div>
        )}
      </div>
    );
  });
Textarea.displayName = "Textarea";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost", size?: "sm" | "md" | "lg" }>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none text-xs uppercase tracking-widest cursor-pointer shadow-sm rounded-none border active:scale-95",
          {
            "bg-[#c1a063] border-[#c1a063] text-[#0f0d0c] hover:bg-[#d4b57a] font-bold": variant === "primary",
            "px-2 py-1 text-[10px]": size === "sm",
            "px-4 py-2": size === "md",
            "px-6 py-3 text-sm": size === "lg",
            "bg-[#1a1614] border-[#3a302a] text-[#8b7355] hover:text-[#c1a063] hover:border-[#c1a063] hover:bg-[#2a2420]": variant === "secondary",
            "bg-[#8a211b] border-[#8a211b] text-white hover:bg-[#a52a23] hover:border-[#a52a23] font-bold": variant === "danger",
            "bg-transparent border-transparent text-[#8b7355] hover:bg-[#1a1614] hover:text-[#c1a063] hover:border-[#3a302a] px-4 py-2 shadow-none": variant === "ghost",
          },
          className
        )}
        {...props}
      />
    );
  });
Button.displayName = "Button";
