import type { SVGProps } from "react";

/**
 * Colored electric hand mixer for the equipment card (no emoji shows one):
 * a body with a carrying handle and two wire beaters underneath.
 */
export function HandMixerArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {/* handle */}
      <path d="M17 19c0-8 7-12 15-12s15 4 15 12" fill="none" stroke="#a8401f" strokeWidth="5.5" strokeLinecap="round" />
      {/* beater shafts */}
      <path d="M24 33v9M40 33v9" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" />
      {/* body */}
      <rect x="7" y="17" width="50" height="18" rx="9" fill="#c9502f" />
      <path d="M14 22.5c2-1.7 5-2.5 9-2.5" fill="none" stroke="#e58a6c" strokeWidth="2.2" strokeLinecap="round" />
      {/* speed switch and vent */}
      <rect x="27" y="14.5" width="10" height="5" rx="2.5" fill="#fff6e8" />
      <path d="M45 24v5M49 24v5" stroke="#8f3a1c" strokeWidth="1.8" strokeLinecap="round" />
      {/* wire beaters */}
      <g fill="none" stroke="#94a3b8" strokeWidth="2.2">
        <ellipse cx="24" cy="50" rx="6.5" ry="9" />
        <ellipse cx="24" cy="50" rx="2.3" ry="9" />
        <ellipse cx="40" cy="50" rx="6.5" ry="9" />
        <ellipse cx="40" cy="50" rx="2.3" ry="9" />
      </g>
    </svg>
  );
}

/** Line version in the lucide stroke style, for small capability icons. */
export function HandMixerIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M7 6c0-2.2 2-3.5 5-3.5s5 1.3 5 3.5" />
      <rect x="3" y="6" width="18" height="6" rx="3" />
      <path d="M9 12v2M15 12v2" />
      <ellipse cx="9" cy="17.8" rx="2" ry="3.7" />
      <ellipse cx="15" cy="17.8" rx="2" ry="3.7" />
    </svg>
  );
}
