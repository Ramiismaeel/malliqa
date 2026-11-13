import { unitLabels } from "@/lib/labels";
import type { AdvancePrep, RecipeIngredient } from "@/lib/schemas/recipe";

// Western digits (0–9) everywhere, for consistency with times.

const FRACTIONS: Array<[number, string]> = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.5, "½"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

/** 0.5 → "½", 1.5 → "1½", 2 → "2", 1.2 → "1.2" */
export function formatNumber(value: number): string {
  const whole = Math.trunc(value);
  const rest = Math.round((value - whole) * 100) / 100;
  if (rest === 0) return String(whole);
  const fraction = FRACTIONS.find(([n]) => Math.abs(n - rest) < 0.02)?.[1];
  if (fraction) return whole === 0 ? fraction : `${whole}${fraction}`;
  return String(Math.round(value * 10) / 10);
}

/** "500 غ", "2 ملعقة كبيرة", "حسب الرغبة" — empty string when there is no amount. */
export function formatAmount(ingredient: Pick<RecipeIngredient, "amount" | "unit">): string {
  if (ingredient.unit === "to-taste") return unitLabels["to-taste"];
  if (ingredient.amount === undefined) return ingredient.unit ? unitLabels[ingredient.unit] : "";
  const amount = formatNumber(ingredient.amount);
  if (!ingredient.unit) return amount;
  // "حبة" reads oddly for countable items ("2 حبة بصل"); the bare number is enough.
  if (ingredient.unit === "piece") return amount;
  return `${amount} ${unitLabels[ingredient.unit]}`;
}

/** 45 → "45 د", 60 → "ساعة", 75 → "1 س 15 د", 120 → "2 س" */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "بلا طبخ";
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? "ساعة" : `${hours} س`;
  return `${hours} س ${rest} د`;
}

/** 1 → "ساعة", 2 → "ساعتين", 8 → "8 ساعات", 12 → "12 ساعة" */
export function formatHours(hours: number): string {
  if (hours === 1) return "ساعة";
  if (hours === 2) return "ساعتين";
  if (hours >= 3 && hours <= 10) return `${formatNumber(hours)} ساعات`;
  return `${formatNumber(hours)} ساعة`;
}

export function formatAdvancePrep(prep: AdvancePrep, label: string): string {
  return `${label} ${formatHours(prep.hours)}`;
}

/** 1 → "شخص", 2 → "شخصين", 4 → "4 أشخاص", 12 → "12 شخصاً" */
export function formatServings(count: number): string {
  if (count === 1) return "شخص";
  if (count === 2) return "شخصين";
  if (count <= 10) return `${count} أشخاص`;
  return `${count} شخصاً`;
}
