"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky area under the content, usually the primary button. */
  footer?: ReactNode;
}

/** Bottom sheet built on the native <dialog> (focus trap + Esc for free). */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal modal-bottom" aria-labelledby={titleId} onClose={onClose}>
      <div className="modal-box mx-auto flex max-h-[88dvh] w-full max-w-md flex-col gap-0 rounded-t-[1.75rem] bg-base-100 p-0">
        <div className="flex shrink-0 flex-col items-center px-5 pt-3">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-base-content/15" />
          <div className="mt-2 flex w-full items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="btn btn-circle btn-ghost btn-sm size-11">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">{open ? children : null}</div>
        {footer && open && (
          <div className="shrink-0 border-t border-base-content/8 bg-base-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="إغلاق">
          إغلاق
        </button>
      </form>
    </dialog>
  );
}
