import { db } from "@/lib/db/dexie";
import type { FavoriteRow } from "@/lib/schemas/backup";

export function listFavorites(): Promise<FavoriteRow[]> {
  return db.favorites.orderBy("addedAt").reverse().toArray();
}

export async function isFavorite(recipeId: string): Promise<boolean> {
  return (await db.favorites.get(recipeId)) !== undefined;
}

export async function toggleFavorite(recipeId: string): Promise<boolean> {
  return db.transaction("rw", db.favorites, async () => {
    const existing = await db.favorites.get(recipeId);
    if (existing) {
      await db.favorites.delete(recipeId);
      return false;
    }
    await db.favorites.put({ recipeId, addedAt: Date.now() });
    return true;
  });
}
