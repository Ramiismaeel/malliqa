import { db } from "@/lib/db/dexie";
import { aiRecipeRowSchema, type AiRecipeRow } from "@/lib/schemas/backup";
import type { Recipe } from "@/lib/schemas/recipe";

export function listAiRecipes(): Promise<AiRecipeRow[]> {
  return db.aiRecipes.orderBy("createdAt").reverse().toArray();
}

export function getAiRecipe(id: string): Promise<AiRecipeRow | undefined> {
  return db.aiRecipes.get(id);
}

/** Saves a reviewed AI suggestion. Only ever called from an explicit user action. */
export async function saveAiRecipe(recipe: Recipe, prompt?: string): Promise<AiRecipeRow> {
  const row = aiRecipeRowSchema.parse({
    ...recipe,
    source: "ai",
    createdAt: Date.now(),
    ...(prompt ? { prompt } : {}),
  });
  await db.aiRecipes.put(row);
  return row;
}

export async function deleteAiRecipe(id: string): Promise<void> {
  await db.transaction("rw", db.aiRecipes, db.favorites, async () => {
    await db.aiRecipes.delete(id);
    await db.favorites.delete(id);
  });
}
