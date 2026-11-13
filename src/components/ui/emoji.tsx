import type { CSSProperties } from "react";

interface EmojiProps {
  children: string;
  className?: string;
  style?: CSSProperties;
  /** When set, the emoji is announced with this label instead of being hidden. */
  label?: string;
}

/** Food emoji act as the app's illustrations (no photos in v1). */
export function Emoji({ children, className = "", style, label }: EmojiProps) {
  return (
    <span
      className={`emoji inline-block ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </span>
  );
}
