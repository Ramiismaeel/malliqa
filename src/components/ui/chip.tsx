import type { ReactNode } from "react";

interface ChipProps {
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Small count shown after the label. */
  count?: number;
  /** Stretch to the width of its grid cell (equal-width filter rows). */
  fill?: boolean;
  className?: string;
}

/** Toggleable filter chip (44px tall tap target). */
export function Chip({ active, onToggle, children, count, fill = false, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border text-sm font-medium whitespace-nowrap ${
        fill ? "w-full min-w-0 justify-center px-2" : "px-4"
      } ${
        active
          ? "border-primary bg-primary text-primary-content shadow-md shadow-primary/25"
          : "border-base-content/10 bg-base-100 text-base-content/80 hover:border-primary/40"
      } ${className}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 text-xs tabular-nums ${
            active ? "bg-primary-content/20" : "bg-base-content/8 text-base-content/65"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
