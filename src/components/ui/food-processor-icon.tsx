import type { SVGProps } from "react";

/**
 * Colored food processor, drawn to sit next to the emoji used for the other
 * equipment (there is no food-processor emoji).
 */
export function FoodProcessorArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {/* feed tube + lid */}
      <rect x="26" y="3" width="12" height="12" rx="3" fill="#cbd5e1" />
      <rect x="12" y="12" width="40" height="7" rx="3.5" fill="#94a3b8" />
      {/* handle */}
      <path d="M48 24h4a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-5" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      {/* bowl */}
      <path d="M15 19h34l-2.4 24.3a3 3 0 0 1-3 2.7H20.400a3 3 0 0 1-3-2.700z" fill="#dbeafe" stroke="#7fb4e6" strokeWidth="1.5" />
      {/* chopped vegetables */}
      <circle cx="23" cy="39" r="2.600" fill="#fb923c" />
      <circle cx="41" cy="38" r="2.400" fill="#4ade80" />
      <rect x="26.500" y="40" width="4.500" height="3.500" rx="1" fill="#ef4444" />
      <rect x="34" y="40.500" width="4.500" height="3.500" rx="1" fill="#facc15" />
      <circle cx="29" cy="34.500" r="1.800" fill="#4ade80" />
      <circle cx="37" cy="33.500" r="1.800" fill="#fb923c" />
      {/* shaft + S-blade */}
      <rect x="30.500" y="23" width="3" height="22" rx="1.5" fill="#64748b" />
      <path d="M32 30c-6.500-2.500-11-1-13 2.500c5 1.500 9.500 1 13-.5z" fill="#94a3b8" />
      <path d="M32 30c6.500 2.500 11 1 13-2.500c-5-1.500-9.500-1-13 .5z" fill="#94a3b8" />
      {/* motor base */}
      <path d="M11 46h42v8a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z" fill="#c9502f" />
      <circle cx="32" cy="52.500" r="3.200" fill="#fff6e8" />
      <circle cx="44" cy="52.500" r="1.500" fill="#fff6e8" opacity="0.7" />
    </svg>
  );
}

/** Line version in the lucide stroke style, for small capability icons. */
export function FoodProcessorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10 6V3h4v3" />
      <path d="M5 6h14" />
      <path d="M6.500 6l.800 9h9.400l.800-9" />
      <path d="M9 11.500c1-1 2-1 3 0s2 1 3 0" />
      <rect x="5" y="15" width="14" height="6" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
