import type { SVGProps } from "react";

/**
 * Colored kibbeh machine (electric meat grinder) for the equipment card —
 * there is no emoji for it: a motor body, a metal head with a feed tray on
 * top, and minced meat coming out of the front.
 */
export function MeatGrinderArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {/* feet */}
      <rect x="33" y="54" width="7" height="5" rx="1.5" fill="#64748b" />
      <rect x="49" y="54" width="7" height="5" rx="1.5" fill="#64748b" />
      {/* motor body */}
      <rect x="29" y="25" width="30" height="31" rx="6" fill="#c9502f" />
      <rect x="37" y="31" width="15" height="3" rx="1.5" fill="#fff6e8" opacity="0.6" />
      <circle cx="46" cy="44" r="4.2" fill="#fff6e8" />
      <path d="M46 44v-2.6" stroke="#c9502f" strokeWidth="1.6" strokeLinecap="round" />
      {/* feed tube */}
      <rect x="18" y="15" width="11" height="17" rx="2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      {/* tray with pieces of meat */}
      <circle cx="19.5" cy="9" r="3.2" fill="#b4533a" />
      <circle cx="27" cy="8.5" r="3.4" fill="#c9644a" />
      <path d="M9 10h29l-3 7H12z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
      {/* head: the barrel with the screw inside */}
      <rect x="12" y="30" width="22" height="15" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M18 33v9M23 33v9M28 33v9" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
      {/* ring that holds the cutting plate */}
      <rect x="8" y="27" width="7" height="21" rx="3" fill="#94a3b8" />
      {/* minced meat coming out */}
      <path
        d="M8 32c-4 1-5 5-3 8M8 37.5c-3 2-3 6-1 9M8 43c-2 2-1 6 2 8"
        fill="none"
        stroke="#b4533a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Line version in the lucide stroke style, for small capability icons. */
export function MeatGrinderIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* tray and feed tube */}
      <path d="M3 4h10l-1.5 3h-7z" />
      <path d="M6.5 7v3M9.5 7v3" />
      {/* head and outlet ring */}
      <path d="M13 10H6.5a1.5 1.5 0 0 0-1.5 1.5v2A1.5 1.5 0 0 0 6.5 15H13" />
      <path d="M3 9.5v6" />
      {/* motor body */}
      <rect x="13" y="8" width="8" height="12" rx="2" />
      <path d="M17 16h.01" />
    </svg>
  );
}
