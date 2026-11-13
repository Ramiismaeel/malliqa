import type { ReactNode } from "react";

interface ChipProps {
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Small count shown after the label. */
  count?: number;
  className?: string;
}

/** Toggleable filter chip (44px tall tap target). */
export function Chip({ active, onToggle, children, count, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`pressable inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
        active
          ? "border-primary bg-primary text-primary-content shadow-md shadow-primary/25"
          : "border-base-content/10 bg-base-100 text-base-content/80 hover:border-primary/40"
      } ${className}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 text-xs tabular-nums ${
            active ? "bg-primary-content/20" : "bg-base-content/8 text-base-content/60"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
