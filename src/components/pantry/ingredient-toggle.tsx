"use client";

import { Check, Pin } from "lucide-react";
import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { Emoji } from "@/components/ui/emoji";

interface IngredientToggleProps {
  name: string;
  emoji: string;
  /** Available in the pantry (or selected, in onboarding). */
  active: boolean;
  /** Pinned as a staple. */
  staple?: boolean;
  onToggle: () => void;
  /** Long-press / right-click: opens the actions menu. */
  onMenu?: () => void;
}

const LONG_PRESS_MS = 500;
/** A finger that travels further than this is scrolling, not pressing. */
const MOVE_TOLERANCE_PX = 10;

/** One ingredient as a large tappable pill. Tap = toggle, long-press = menu. */
export function IngredientToggle({ name, emoji, active, staple = false, onToggle, onMenu }: IngredientToggleProps) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const pressOrigin = useRef({ x: 0, y: 0 });

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // The pill moves between sections when it is toggled; a timer left behind
  // by the old copy must not open the menu later.
  useEffect(() => clearTimer, []);

  const startPress = (event: PointerEvent) => {
    if (!onMenu) return;
    longPressed.current = false;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      longPressed.current = true;
      onMenu();
    }, LONG_PRESS_MS);
  };

  const trackPress = (event: PointerEvent) => {
    if (timer.current === null) return;
    const dx = event.clientX - pressOrigin.current.x;
    const dy = event.clientY - pressOrigin.current.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) clearTimer();
  };

  const handleClick = () => {
    clearTimer();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onToggle();
  };

  const handleContextMenu = (event: MouseEvent) => {
    if (!onMenu) return;
    event.preventDefault();
    clearTimer();
    longPressed.current = false;
    onMenu();
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerMove={trackPress}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={handleContextMenu}
      className={`pressable inline-flex min-h-11 select-none items-center gap-1.5 rounded-full border ps-2.5 pe-3.5 text-sm font-medium [-webkit-touch-callout:none] ${
        active
          ? "border-secondary/40 bg-secondary/15 text-base-content shadow-sm"
          : staple
            ? "border-dashed border-base-content/25 bg-base-100/60 text-base-content/65"
            : "border-base-content/10 bg-base-100 text-base-content/75 hover:border-secondary/40"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
          active ? "bg-secondary text-secondary-content" : "bg-base-content/6"
        }`}
      >
        {active ? <Check key="on" className="size-3.5 animate-pop" strokeWidth={3} /> : <Emoji className="text-sm">{emoji}</Emoji>}
      </span>
      <span>{name}</span>
      {staple && <Pin className="size-3.5 shrink-0 rotate-45 text-primary" aria-label="أساسي" />}
    </button>
  );
}
