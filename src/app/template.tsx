import type { ReactNode } from "react";

// A template re-mounts on every navigation, which replays the entry animation.
// Opacity only: a transform here would become the containing block of
// `position: fixed` children (e.g. the onboarding footer) while it animates.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-fade">{children}</div>;
}
