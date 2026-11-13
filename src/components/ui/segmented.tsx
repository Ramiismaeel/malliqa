import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the control. */
  label: string;
  className?: string;
}

/** Segmented control with a sliding thumb (direction-aware for RTL). */
export function Segmented<T extends string>({ options, value, onChange, label, className = "" }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const width = 100 / options.length;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative flex rounded-full border border-base-content/8 bg-base-100 p-1 shadow-sm ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-primary shadow-md shadow-primary/30 transition-[inset-inline-start] duration-300 ease-out-soft"
        style={{
          width: `calc(${width}% - 0.25rem)`,
          insetInlineStart: `calc(${index * width}% + 0.125rem)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-300 ${
              selected ? "text-primary-content" : "text-base-content/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
