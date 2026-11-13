import type { Capability } from "@/lib/schemas/equipment";
import { courseOf, type Course, type Cuisine, type Difficulty, type MealType, type Recipe } from "@/lib/schemas/recipe";
import { buildAvailability, resolveRef, type Availability } from "./resolveAvailability";
import { timeBucketOf, totalMinutes, type TimeBucket } from "./timeBucket";

// The matching engine. Pure functions only: no React, no Dexie, no browser
// APIs, no UI strings. Everything it needs comes in through the input.

export type MatchStatus = "ready" | "almost" | "shopping" | "unsuitable";
export type Day = "today" | "tomorrow";

export interface MatchFilters {
  time?: TimeBucket[];
  difficulty?: Difficulty[];
  mealType?: MealType[];
  cuisine?: Cuisine[];
  course?: Course[];
}

export interface MatchInput {
  recipes: Recipe[];
  /** Pantry available (incl. staples) + custom ingredients. */
  availableIngredientIds: ReadonlySet<string>;
  stapleIds: ReadonlySet<string>;
  /** Derived from available equipment. */
  capabilities: ReadonlySet<Capability>;
  /** ingredient id → group ids (built-in dictionary + custom ingredients). */
  ingredientGroups: ReadonlyMap<string, readonly string[]>;
  day: Day;
  filters?: MatchFilters;
  excludedMealTypes?: MealType[];
}

export interface ViaGroup {
  /** The recipe ref, e.g. `group:tomato-base`. */
  ref: string;
  /** The pantry ingredient that satisfies it, e.g. `tomato-juice`. */
  ingredientId: string;
}

export interface ViaSubstitute {
  /** The recipe ref that is missing. */
  ref: string;
  /** The pantry ingredient used instead. */
  ingredientId: string;
  note?: string;
}

export interface MatchResult {
  recipe: Recipe;
  status: MatchStatus;
  /** Refs of required ingredients that are missing. */
  missing: string[];
  viaGroup: ViaGroup[];
  viaSubstitute: ViaSubstitute[];
  /** Refs of optional ingredients that are not available. */
  optionalMissing: string[];
  missingEquipment: Capability[];
  /** Distinct non-staple pantry items this recipe would use. */
  freshUsed: number;
  /** Display only — never used for ranking. */
  matchPercent: number;
  needsAdvancePrep: boolean;
  timeBucket: TimeBucket;
}

export const ALMOST_MAX_MISSING = 2;

const STATUS_ORDER: Record<MatchStatus, number> = {
  ready: 0,
  almost: 1,
  shopping: 2,
  unsuitable: 3,
};

function findSubstitute(recipe: Recipe, ref: string, availability: Availability): ViaSubstitute | null {
  for (const substitute of recipe.substitutes ?? []) {
    if (substitute.for !== ref) continue;
    for (const use of substitute.use) {
      const resolved = resolveRef(use, availability);
      if (resolved.kind !== "missing") {
        return {
          ref,
          ingredientId: resolved.ingredientId,
          ...(substitute.note ? { note: substitute.note } : {}),
        };
      }
    }
  }
  return null;
}

function statusFor(missingCount: number, missingEquipmentCount: number): MatchStatus {
  if (missingEquipmentCount > 0) return "unsuitable";
  if (missingCount === 0) return "ready";
  if (missingCount <= ALMOST_MAX_MISSING) return "almost";
  return "shopping";
}

/** Matches a single recipe against the pantry and equipment. */
export function matchRecipe(
  recipe: Recipe,
  availability: Availability,
  capabilities: ReadonlySet<Capability>,
  day: Day,
): MatchResult {
  const missing: string[] = [];
  const viaGroup: ViaGroup[] = [];
  const viaSubstitute: ViaSubstitute[] = [];
  const optionalMissing: string[] = [];
  const used = new Set<string>();
  let requiredTotal = 0;

  for (const ingredient of recipe.ingredients) {
    const isRequired = ingredient.role === "required";
    if (isRequired) requiredTotal += 1;

    const resolved = resolveRef(ingredient.ref, availability);
    if (resolved.kind !== "missing") {
      used.add(resolved.ingredientId);
      if (resolved.kind === "have-via-group") {
        viaGroup.push({ ref: ingredient.ref, ingredientId: resolved.ingredientId });
      }
      continue;
    }

    if (!isRequired) {
      optionalMissing.push(ingredient.ref);
      continue;
    }

    const substitute = findSubstitute(recipe, ingredient.ref, availability);
    if (substitute) {
      used.add(substitute.ingredientId);
      viaSubstitute.push(substitute);
    } else {
      missing.push(ingredient.ref);
    }
  }

  const missingEquipment = recipe.equipment
    .filter((e) => e.role === "required" && !capabilities.has(e.cap))
    .map((e) => e.cap);

  let freshUsed = 0;
  for (const id of used) {
    if (!availability.staples.has(id)) freshUsed += 1;
  }

  const matchPercent =
    requiredTotal === 0 ? 100 : Math.round(((requiredTotal - missing.length) / requiredTotal) * 100);

  return {
    recipe,
    status: statusFor(missing.length, missingEquipment.length),
    missing,
    viaGroup,
    viaSubstitute,
    optionalMissing,
    missingEquipment,
    freshUsed,
    matchPercent,
    needsAdvancePrep: day === "today" && recipe.advancePrep !== undefined,
    timeBucket: timeBucketOf(recipe),
  };
}

function passesFilters(result: MatchResult, filters: MatchFilters | undefined): boolean {
  if (!filters) return true;
  const { recipe } = result;
  if (filters.time?.length && !filters.time.includes(result.timeBucket)) return false;
  if (filters.difficulty?.length && !filters.difficulty.includes(recipe.difficulty)) return false;
  if (filters.mealType?.length && !filters.mealType.includes(recipe.mealType)) return false;
  if (filters.cuisine?.length && !filters.cuisine.includes(recipe.cuisine)) return false;
  if (filters.course?.length && !filters.course.includes(courseOf(recipe))) return false;
  return true;
}

/**
 * Ranking: status → fewer missing → more fresh (non-staple) items used →
 * shorter → name. `matchPercent` is intentionally not part of it.
 */
export function compareMatches(a: MatchResult, b: MatchResult): number {
  return (
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    a.missing.length - b.missing.length ||
    b.freshUsed - a.freshUsed ||
    totalMinutes(a.recipe) - totalMinutes(b.recipe) ||
    a.recipe.name.localeCompare(b.recipe.name, "ar")
  );
}

export function matchRecipes(input: MatchInput): MatchResult[] {
  const availability = buildAvailability(input);
  const excluded = new Set<MealType>(input.excludedMealTypes ?? []);

  return input.recipes
    .filter((recipe) => !excluded.has(recipe.mealType))
    .map((recipe) => matchRecipe(recipe, availability, input.capabilities, input.day))
    .filter((result) => passesFilters(result, input.filters))
    .sort(compareMatches);
}

export interface MatchSections {
  /** "جاهزة الآن" */
  ready: MatchResult[];
  /** "ينقصها شيء بسيط" */
  almost: MatchResult[];
  /** Today mode only: cookable recipes that need soaking/marinating first. */
  prepTonight: MatchResult[];
  /** "تحتاج تسوّق" */
  shopping: MatchResult[];
  /** Missing required equipment — hidden by default. */
  unsuitable: MatchResult[];
}

/** Splits ranked results into the home-page sections, keeping their order. */
export function toSections(results: MatchResult[]): MatchSections {
  const sections: MatchSections = { ready: [], almost: [], prepTonight: [], shopping: [], unsuitable: [] };
  for (const result of results) {
    if (result.status === "unsuitable") sections.unsuitable.push(result);
    else if (result.status === "shopping") sections.shopping.push(result);
    else if (result.needsAdvancePrep) sections.prepTonight.push(result);
    else if (result.status === "ready") sections.ready.push(result);
    else sections.almost.push(result);
  }
  return sections;
}
