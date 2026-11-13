import { courseOf, type Course } from "@/lib/schemas/recipe";
import type { MatchResult } from "./matchRecipes";

// How ranked results are laid out for the user. `matchRecipes` decides what
// can be cooked; these functions only decide the order on screen. Pure, like
// the rest of the engine.

/** Main dishes first, then appetizers, then desserts. */
export const COURSE_ORDER: Record<Course, number> = { main: 0, appetizer: 1, dessert: 2 };

const courseRank = (result: MatchResult): number => COURSE_ORDER[courseOf(result.recipe)];

/**
 * Catalog order: grouped by course, each group keeping the order it came in
 * (the engine's ranking).
 */
export function groupByCourse(results: readonly MatchResult[]): MatchResult[] {
  return [...results].sort((a, b) => courseRank(a) - courseRank(b));
}

/** 32-bit FNV-1a with a final avalanche, so close strings give far-apart numbers. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Order of a home-page section: course → fewer missing ingredients → a shuffle
 * that depends only on `seed` and the recipe id.
 *
 * With the date as the seed, the same dish is not on top every day, yet the
 * list does not jump around while the pantry is being edited: a recipe keeps
 * its place relative to the others for the whole day.
 */
export function arrangeForDay(results: readonly MatchResult[], seed: string): MatchResult[] {
  const key = new Map(results.map((result) => [result.recipe.id, hash(`${seed}|${result.recipe.id}`)]));
  const keyOf = (result: MatchResult): number => key.get(result.recipe.id) ?? 0;
  return [...results].sort(
    (a, b) =>
      courseRank(a) - courseRank(b) ||
      a.missing.length - b.missing.length ||
      keyOf(a) - keyOf(b) ||
      a.recipe.id.localeCompare(b.recipe.id),
  );
}
