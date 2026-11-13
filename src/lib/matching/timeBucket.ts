import type { Recipe } from "@/lib/schemas/recipe";

export type TimeBucket = "quick" | "medium" | "long";

export const QUICK_MAX_MINUTES = 30;
export const MEDIUM_MAX_MINUTES = 60;

type Timed = Pick<Recipe, "prepMinutes" | "cookMinutes">;

/** Active time only. `advancePrep` hours are shown separately, never added. */
export function totalMinutes(recipe: Timed): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

/** Computed, never stored: quick ≤ 30, medium 31–60, long > 60. */
export function timeBucketOf(recipe: Timed): TimeBucket {
  const minutes = totalMinutes(recipe);
  if (minutes <= QUICK_MAX_MINUTES) return "quick";
  if (minutes <= MEDIUM_MAX_MINUTES) return "medium";
  return "long";
}
