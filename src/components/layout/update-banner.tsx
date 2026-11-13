"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * "يوجد إصدار جديد — حدّث". The new service worker waits until the user
 * agrees, so the UI never changes in the middle of cooking.
 */
export function UpdateBanner() {
  const { serwist } = useSerwist();
  const [waiting, setWaiting] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setWaiting(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  if (!serwist || !waiting) return null;

  const update = () => {
    setUpdating(true);
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]" role="status">
      <div className="mx-auto flex w-full max-w-md animate-slide-down items-center justify-between gap-3 rounded-2xl bg-neutral px-4 py-2.5 text-neutral-content shadow-xl">
        <span className="text-sm font-medium">يوجد إصدار جديد</span>
        <button type="button" onClick={update} disabled={updating} className="btn btn-accent btn-sm min-h-9 rounded-full">
          <RefreshCw className={`size-4 ${updating ? "animate-spin" : ""}`} />
          حدّث
        </button>
      </div>
    </div>
  );
}
