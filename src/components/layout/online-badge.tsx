"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/hooks/use-online";

/**
 * Appears only while offline: everything except the AI assistant keeps
 * working, so being online needs no decoration.
 */
export function OnlineBadge() {
  const online = useOnline();
  if (online) return null;

  return (
    <span
      role="status"
      className="inline-flex animate-pop items-center gap-1.5 rounded-full bg-warning/25 px-3 py-1.5 text-xs font-semibold text-base-content"
    >
      <WifiOff className="size-3.5" />
      بلا إنترنت
    </span>
  );
}
