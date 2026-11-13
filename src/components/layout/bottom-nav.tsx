"use client";

import { BookOpen, ChefHat, Refrigerator, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

const tabs: Tab[] = [
  { href: "/", label: "اقتراحات", icon: ChefHat, isActive: (p) => p === "/" },
  { href: "/pantry", label: "مطبخي", icon: Refrigerator, isActive: (p) => p.startsWith("/pantry") },
  {
    href: "/recipes",
    label: "وصفات",
    icon: BookOpen,
    isActive: (p) => p.startsWith("/recipes") || p.startsWith("/my-recipes"),
  },
  { href: "/settings", label: "إعدادات", icon: Settings, isActive: (p) => p.startsWith("/settings") },
];

/**
 * Floating bottom navigation with the 4 main tabs.
 *
 * From the top edge of the bar down to the screen edge, every point belongs to
 * a tab: each link fills its whole cell (no dead gaps or padding) and reaches
 * past the pill — down to the screen edge, and sideways for the outer tabs.
 * The zone also swallows taps, so a near miss can never land on the page
 * behind the bar (it used to toggle pantry items that were scrolled under it).
 * Only the soft fade above the bar lets taps through to the page.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-base-200 from-55% to-transparent pt-3"
    >
      <div className="pointer-events-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ul className="mx-auto flex w-full max-w-md items-stretch rounded-[1.75rem] border border-base-content/8 bg-base-100/90 shadow-xl shadow-base-content/10 backdrop-blur-xl">
          {tabs.map((tab, index) => {
            const active = tab.isActive(pathname);
            const Icon = tab.icon;
            const first = index === 0;
            const last = index === tabs.length - 1;
            return (
              <li key={tab.href} className="flex flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex flex-1 py-1.5 after:absolute after:top-0 after:-bottom-16 after:content-[''] ${
                    first ? "ps-1.5 pe-0.5 after:-start-4 after:end-0" : last ? "ps-0.5 pe-1.5 after:start-0 after:-end-4" : "px-0.5 after:inset-x-0"
                  }`}
                >
                  <span
                    className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[0.7rem] font-semibold transition-[transform,background-color,color,box-shadow] duration-200 ease-out-soft group-active:scale-95 ${
                      active
                        ? "bg-primary text-primary-content shadow-md shadow-primary/30"
                        : "text-base-content/65 group-hover:text-base-content"
                    }`}
                  >
                    <Icon
                      className={`size-6 transition-transform duration-300 ease-spring ${active ? "-translate-y-0.5 scale-110" : "group-hover:scale-105"}`}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    <span>{tab.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
