import type { ReactNode } from "react";
import { Emoji } from "./emoji";

interface EmptyStateProps {
  emoji: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ emoji, title, children, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex animate-rise flex-col items-center gap-3 px-6 py-10 text-center ${className}`}>
      <span className="grid size-20 place-items-center rounded-full bg-accent/25">
        <Emoji className="animate-float text-4xl">{emoji}</Emoji>
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="max-w-xs text-sm leading-relaxed text-base-content/65">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
