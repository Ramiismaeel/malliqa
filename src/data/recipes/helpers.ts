import type { Capability } from "@/lib/schemas/equipment";
import type { Cuisine, Recipe, RecipeIngredient, Unit } from "@/lib/schemas/recipe";

// Small helpers that keep recipe files short and easy to edit by hand.
//
//   req("minced-meat", 400, "g")        required ingredient with amount
//   req("salt")                          required, "to taste"
//   opt(g("nuts-any"), 2, "tbsp")        optional, any member of a group
//   need("stovetop")                     required equipment capability
//   nice("blender")                      optional equipment capability

/** Reference to an ingredient group: any member satisfies it. */
export const g = (groupId: string): string => `group:${groupId}`;

function ingredient(
  role: RecipeIngredient["role"],
  ref: string,
  amount?: number,
  unit?: Unit,
  note?: string,
): RecipeIngredient {
  return {
    ref,
    role,
    ...(amount !== undefined ? { amount } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(note !== undefined ? { note } : {}),
  };
}

export const req = (ref: string, amount?: number, unit?: Unit, note?: string): RecipeIngredient =>
  ingredient("required", ref, amount, unit, note);

export const opt = (ref: string, amount?: number, unit?: Unit, note?: string): RecipeIngredient =>
  ingredient("optional", ref, amount, unit, note);

export const need = (...caps: Capability[]): Recipe["equipment"] =>
  caps.map((cap) => ({ cap, role: "required" as const }));

export const nice = (...caps: Capability[]): Recipe["equipment"] =>
  caps.map((cap) => ({ cap, role: "optional" as const }));

export type RecipeDraft = Omit<Recipe, "cuisine" | "source">;

/** Stamps the cuisine and `source: 'builtin'` on every recipe of a file. */
export function defineRecipes(cuisine: Cuisine, drafts: RecipeDraft[]): Recipe[] {
  return drafts.map((draft) => ({ ...draft, cuisine, source: "builtin" as const }));
}
