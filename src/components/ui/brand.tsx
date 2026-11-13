interface BrandMarkProps {
  className?: string;
  /** Animate the steam (splash, loading states). */
  steaming?: boolean;
}

/** The ملّيقة mark: a cooking pot with rising steam. */
export function BrandMark({ className = "", steaming = false }: BrandMarkProps) {
  const steam = steaming ? "animate-steam" : "";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="currentColor">
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        <path className={steam} d="M23 6c-3.2 4 3.2 6.5 0 11" />
        <path className={steam} style={{ animationDelay: "0.5s" }} d="M32 4c-3.2 4 3.2 6.5 0 11" />
        <path className={steam} style={{ animationDelay: "1s" }} d="M41 6c-3.2 4 3.2 6.5 0 11" />
      </g>
      <rect x="13" y="23" width="38" height="5.5" rx="2.75" />
      <path d="M11.5 31.5h41v9.5c0 9.5-7.4 16-20.5 16S11.500 50.500 11.500 41z" />
      <rect x="4" y="33.500" width="9" height="5.500" rx="2.750" />
      <rect x="51" y="33.500" width="9" height="5.500" rx="2.750" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
}

/** Wordmark: pot + "ملّيقة". */
export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
        <BrandMark className="size-6" />
      </span>
      <span className="font-display text-3xl leading-none text-primary">ملّيقة</span>
    </span>
  );
}
