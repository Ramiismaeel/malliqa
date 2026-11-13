import type { SVGProps } from "react";

/**
 * Colored microwave oven for the equipment card (there is no microwave emoji):
 * a rectangular box with a glass door and a control panel.
 */
export function MicrowaveArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {/* feet */}
      <rect x="10" y="50" width="7" height="4" rx="1.5" fill="#64748b" />
      <rect x="47" y="50" width="7" height="4" rx="1.5" fill="#64748b" />
      {/* body */}
      <rect x="4" y="13" width="56" height="38" rx="6" fill="#cbd5e1" />
      <rect x="4" y="13" width="56" height="38" rx="6" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      {/* door window */}
      <rect x="9" y="18" width="34" height="28" rx="4" fill="#1e293b" />
      <rect x="11.5" y="20.5" width="29" height="23" rx="2.5" fill="#334155" />
      {/* warm glow + plate with food */}
      <ellipse cx="26" cy="33" rx="11" ry="8" fill="#fbbf24" opacity="0.28" />
      <ellipse cx="26" cy="39" rx="10" ry="2.2" fill="#e2e8f0" />
      <path d="M19 38a7 6 0 0 1 14 0z" fill="#fb923c" />
      <circle cx="23.5" cy="35.5" r="1.1" fill="#fde68a" />
      <circle cx="28" cy="34.3" r="1.1" fill="#fde68a" />
      {/* glass shine */}
      <path d="M14 23.5h5l-5 7z" fill="#fff" opacity="0.25" />
      {/* door handle */}
      <rect x="44.5" y="19" width="2" height="26" rx="1" fill="#94a3b8" />
      {/* control panel */}
      <rect x="49" y="19" width="7.5" height="6" rx="1.5" fill="#0f172a" />
      <rect x="50.5" y="21" width="4.5" height="2" rx="0.5" fill="#4ade80" />
      <circle cx="52.75" cy="31" r="2.3" fill="#c9502f" />
      <circle cx="52.75" cy="38" r="1.4" fill="#64748b" />
      <circle cx="52.75" cy="42.5" r="1.4" fill="#64748b" />
    </svg>
  );
}
