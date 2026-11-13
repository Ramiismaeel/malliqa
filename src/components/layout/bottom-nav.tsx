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

/** Floating bottom navigation with the 4 main tabs. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto mx-auto flex w-full max-w-md items-stretch justify-between gap-1 rounded-[1.75rem] border border-base-content/8 bg-base-100/90 p-1.5 shadow-xl shadow-base-content/10 backdrop-blur-xl">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`pressable group flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[0.7rem] font-semibold ${
                  active ? "bg-primary text-primary-content shadow-md shadow-primary/30" : "text-base-content/60 hover:text-base-content"
                }`}
              >
                <Icon
                  className={`size-6 transition-transform duration-300 ease-spring ${active ? "-translate-y-0.5 scale-110" : "group-hover:scale-105"}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
