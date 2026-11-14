import type { SVGProps } from "react";

/**
 * Colored air fryer for the equipment card (no emoji shows one): a rounded
 * pod with a dial on top and a pull-out basket, hot air rising beside it.
 */
export function AirFryerArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {/* feet */}
      <rect x="15" y="55" width="7" height="5" rx="1.5" fill="#64748b" />
      <rect x="36" y="55" width="7" height="5" rx="1.5" fill="#64748b" />
      {/* body */}
      <rect x="8" y="5" width="42" height="52" rx="13" fill="#475569" />
      <path d="M14 14c2-3 5-4.5 9-4.5" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
      {/* dial */}
      <circle cx="29" cy="19" r="7.5" fill="#1e293b" />
      <circle cx="29" cy="19" r="4.8" fill="#f59e0b" />
      <path d="M29 19v-3.4" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
      {/* basket drawer with its handle */}
      <rect x="12" y="31" width="34" height="22" rx="7" fill="#64748b" />
      <rect x="21" y="38" width="16" height="6" rx="3" fill="#e2e8f0" />
      {/* hot air */}
      <path
        d="M55 15c2.5 2.5 2.5 5.5 0 8M59.5 24c2.5 3 2.5 7 0 10M55 35c2.5 2.5 2.5 5.5 0 8"
        fill="none"
        stroke="#fb923c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Line version in the lucide stroke style, for small capability icons. */
export function AirFryerIcon(props: SVGProps<SVGSVGElement>) {
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
      <rect x="5" y="2.5" width="14" height="19" rx="4.5" />
      <path d="M5 11h14" />
      <path d="M10 15.5h4" />
      <path d="M12 6.7h.01" />
    </svg>
  );
}
