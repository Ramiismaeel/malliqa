import type { ReactNode } from "react";
import { Emoji } from "./emoji";

interface SectionProps {
  title: string;
  emoji?: string;
  count?: number;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled block used on every screen. */
export function Section({ title, emoji, count, hint, action, children, className = "" }: SectionProps) {
  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {emoji && <Emoji>{emoji}</Emoji>}
            <span>{title}</span>
            {count !== undefined && (
              <span className="rounded-full bg-base-content/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-base-content/65">
                {count}
              </span>
            )}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-base-content/65">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
