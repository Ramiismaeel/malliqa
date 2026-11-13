import { BrandMark } from "./brand";

/** Full-screen loading state shown while IndexedDB answers for the first time. */
export function Splash() {
  return (
    <div
      className="grid min-h-dvh place-items-center px-6"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل ملّيقة"
    >
      <div className="flex animate-fade flex-col items-center gap-4">
        <span className="grid size-24 place-items-center rounded-[2rem] bg-primary text-primary-content shadow-xl shadow-primary/25">
          <BrandMark className="size-16" steaming />
        </span>
        <span className="font-display text-5xl text-primary">ملّيقة</span>
        <span className="text-sm text-base-content/65">شو نطبخ اليوم؟</span>
      </div>
    </div>
  );
}
