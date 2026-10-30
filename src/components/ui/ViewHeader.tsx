import React from "react";
import { cn } from "../../lib/utils";

interface ViewHeaderProps {
  icon?: React.ElementType;
  title: React.ReactNode;
  /** Shorter title shown on phones. */
  shortTitle?: React.ReactNode;
  /** Control before the title, e.g. a back button. */
  leading?: React.ReactNode;
  /** Buttons on the right of the title row. */
  actions?: React.ReactNode;
  /** Optional second row (tabs, filters, combat controls...). */
  children?: React.ReactNode;
}

/** Shared top bar for every view: title + actions on one row, optional controls row below. */
export function ViewHeader({ icon: Icon, title, shortTitle, leading, actions, children }: ViewHeaderProps) {
  return (
    <div className="shrink-0 bg-dm-bg border-b border-dm-border px-3 sm:px-6 py-3 flex flex-col gap-3 relative z-20">
      <div className="flex items-center gap-3 min-h-9">
        {leading && <div className="flex items-center shrink-0">{leading}</div>}
        <h2 className="flex-1 min-w-0 text-base sm:text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2">
          {Icon && <Icon size={20} className="shrink-0" />}
          {shortTitle ? (
            <>
              <span className="truncate sm:hidden">{shortTitle}</span>
              <span className="truncate hidden sm:inline">{title}</span>
            </>
          ) : (
            <span className="truncate">{title}</span>
          )}
        </h2>
        {actions && <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  /** "always" keeps the text on every screen; "wide" hides it below 1024px; "never" is icon + tooltip only. */
  showLabel?: "always" | "wide" | "never";
  /** Shorter text for phones when showLabel is "always" (e.g. "Nueva" for "Nueva Misión"). */
  shortLabel?: string;
}

/** Compact header button: icon always, text label depending on screen width. */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, label, variant = "secondary", showLabel = "wide", shortLabel, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-10 min-w-10 sm:h-9 sm:min-w-9 px-2.5 border text-xs uppercase tracking-widest whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-95",
        variant === "primary" && "bg-dm-accent border-dm-accent text-dm-bg-darker font-bold hover:bg-dm-accent-hover",
        variant === "secondary" && "bg-dm-bg-hover border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent",
        variant === "danger" && "bg-dm-danger border-dm-danger text-dm-text-bright font-bold hover:bg-dm-danger-hover",
        showLabel === "always" && "px-3",
        className
      )}
      {...props}
    >
      <Icon size={16} className="shrink-0" />
      {shortLabel && showLabel === "always" ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : showLabel === "never" ? null : (
        <span className={cn(showLabel === "wide" && "hidden lg:inline")}>{label}</span>
      )}
    </button>
  )
);
ToolbarButton.displayName = "ToolbarButton";

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}

/** Tab switcher that fills the width on phones and sizes to content on larger screens. */
export function SegmentedTabs<T extends string>({ value, onChange, options, className }: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" className={cn("grid grid-flow-col auto-cols-fr sm:inline-grid sm:auto-cols-max gap-1 p-1 bg-dm-bg-darker border border-dm-border w-full sm:w-auto self-start", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2 sm:px-4 py-2 sm:py-1.5 text-[11px] sm:text-xs uppercase tracking-wider truncate transition-colors",
            value === opt.value ? "bg-dm-accent text-dm-bg-darker font-bold" : "text-dm-muted hover:text-dm-accent"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
