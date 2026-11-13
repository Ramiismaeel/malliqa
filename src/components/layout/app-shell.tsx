"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { BottomNav } from "./bottom-nav";
import { OnboardingGate } from "./onboarding-gate";
import { UpdateBanner } from "./update-banner";

const SW_URL = "/serwist/sw.js";
const HIDE_NAV_PATHS = ["/onboarding"];

/** Client-side frame around every page: service worker, toasts, gate, nav. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = !HIDE_NAV_PATHS.some((path) => pathname.startsWith(path));

  return (
    <SerwistProvider
      swUrl={SW_URL}
      disable={process.env.NODE_ENV !== "production"}
      // Never reload on our own: the user may be in the middle of a recipe.
      reloadOnOnline={false}
    >
      <ToastProvider>
        <UpdateBanner />
        <OnboardingGate>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
            <main className={`flex-1 px-4 pt-safe ${showNav ? "pb-nav" : "pb-6"}`}>{children}</main>
          </div>
          {showNav && <BottomNav />}
        </OnboardingGate>
      </ToastProvider>
    </SerwistProvider>
  );
}
