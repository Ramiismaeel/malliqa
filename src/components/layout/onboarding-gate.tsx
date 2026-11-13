"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Splash } from "@/components/ui/splash";
import { useSettings } from "@/lib/db/hooks";

// Pages that must render even before the first-run setup is finished.
const OPEN_PATHS = ["/onboarding", "/offline"];

/** Sends first-time users to the onboarding wizard. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  const isOpenPath = OPEN_PATHS.some((path) => pathname.startsWith(path));
  const mustOnboard = settings !== undefined && !settings.onboardingDone && !isOpenPath;

  useEffect(() => {
    if (mustOnboard) router.replace("/onboarding");
  }, [mustOnboard, router]);

  if (isOpenPath) return children;
  if (settings === undefined || mustOnboard) return <Splash />;
  return children;
}
