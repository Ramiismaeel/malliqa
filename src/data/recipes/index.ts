import type { Recipe } from "@/lib/schemas/recipe";
import { arabRecipes } from "./arab";
import { asianRecipes } from "./asian";
import { bakeryRecipes } from "./bakery";
import { italianRecipes } from "./italian";
import { levantineRecipes } from "./levantine";
import { quickRecipes } from "./quick";
import { syrianRecipes } from "./syrian";

// All built-in recipes. Validated by `recipes.test.ts` (Zod + every ref exists).
// To add a recipe: append it to the file of its cuisine — nothing else to wire.
export const allRecipes: Recipe[] = [
  ...syrianRecipes,
  ...levantineRecipes,
  ...arabRecipes,
  ...italianRecipes,
  ...asianRecipes,
  ...quickRecipes,
  ...bakeryRecipes,
];

export const recipeById: ReadonlyMap<string, Recipe> = new Map(allRecipes.map((r) => [r.id, r]));
