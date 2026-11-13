import type { CSSProperties } from "react";
import { foodArt } from "@/data/food-art";
import { ART_PREFIX } from "@/lib/schemas/recipe";

interface EmojiProps {
  /** An emoji, or `art:<name>` for a drawing from `src/data/food-art.ts`. */
  children: string;
  className?: string;
  style?: CSSProperties;
  /** When set, the emoji is announced with this label instead of being hidden. */
  label?: string;
}

/** Shown when an `art:` name is unknown (e.g. data written by a newer version). */
const FALLBACK = "🍽️";

/** Food emoji act as the app's illustrations (no photos in v1). */
export function Emoji({ children, className = "", style, label }: EmojiProps) {
  const isArt = children.startsWith(ART_PREFIX);
  const art = isArt ? foodArt[children.slice(ART_PREFIX.length)] : undefined;

  return (
    <span
      className={`emoji inline-block ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {art ? (
        <svg
          viewBox="0 0 64 64"
          className="inline-block size-[1.2em] align-[-0.2em]"
          focusable="false"
          // Static markup from our own module — never user or AI text.
          dangerouslySetInnerHTML={{ __html: art }}
        />
      ) : isArt ? (
        FALLBACK
      ) : (
        children
      )}
    </span>
  );
}
