"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Shown at the end of the header (e.g. online badge, action button). */
  action?: ReactNode;
  /** Shows a back button. In RTL "back" points to the right. */
  back?: boolean | string;
}

export function PageHeader({ title, subtitle, action, back }: PageHeaderProps) {
  const router = useRouter();

  const goBack = () => {
    if (typeof back === "string") router.push(back);
    else if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <button
            type="button"
            onClick={goBack}
            aria-label="رجوع"
            className="btn btn-circle btn-ghost size-11 shrink-0 bg-base-100/70"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-base-content/60">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
