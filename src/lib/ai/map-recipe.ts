import { findIngredientIdByName } from "@/lib/kitchen/names";
import type { AiGeneratedRecipe } from "@/lib/schemas/ai";
import { CUSTOM_PREFIX, recipeSchema, type Recipe, type RecipeIngredient } from "@/lib/schemas/recipe";

/**
 * Converts model output into an app Recipe:
 * - ingredient names are mapped to dictionary ids via normalized names/aliases;
 * - unknown names become `custom:<name>` refs (flagged in the UI);
 * - duplicates are merged so a ref never appears twice.
 * Throws (ZodError) when the result is not a valid Recipe.
 */
export function toRecipe(generated: AiGeneratedRecipe, id: string): Recipe {
  const seen = new Set<string>();
  const ingredients: RecipeIngredient[] = [];

  for (const item of generated.ingredients) {
    const ref = findIngredientIdByName(item.name) ?? `${CUSTOM_PREFIX}${item.name}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    ingredients.push({
      ref,
      role: item.role,
      ...(item.amount !== undefined ? { amount: item.amount } : {}),
      ...(item.unit ? { unit: item.unit } : {}),
      ...(item.note ? { note: item.note } : {}),
    });
  }

  return recipeSchema.parse({
    id,
    name: generated.name,
    ...(generated.nameEn ? { nameEn: generated.nameEn } : {}),
    ...(generated.emoji ? { emoji: generated.emoji } : {}),
    description: generated.description,
    cuisine: generated.cuisine,
    mealType: generated.mealType,
    difficulty: generated.difficulty,
    prepMinutes: generated.prepMinutes,
    cookMinutes: generated.cookMinutes,
    servings: generated.servings,
    ingredients,
    equipment: [...new Set(generated.equipment)].map((cap) => ({ cap, role: "required" as const })),
    steps: generated.steps,
    ...(generated.tags?.length ? { tags: generated.tags } : {}),
    source: "ai",
  });
}

/** Refs of a recipe that are not in the ingredient dictionary. */
export function unknownIngredientNames(recipe: Recipe): string[] {
  return recipe.ingredients
    .filter((ingredient) => ingredient.ref.startsWith(CUSTOM_PREFIX))
    .map((ingredient) => ingredient.ref.slice(CUSTOM_PREFIX.length));
}
