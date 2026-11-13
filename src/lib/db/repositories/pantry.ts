import { db } from "@/lib/db/dexie";
import {
  customIngredientSchema,
  type CustomIngredient,
  type PantryRow,
} from "@/lib/schemas/backup";
import type { IngredientCategory } from "@/lib/schemas/ingredient";

// A missing pantry row means "not available". Rows are only kept for items
// that are available or marked as staples.

export function listPantry(): Promise<PantryRow[]> {
  return db.pantry.toArray();
}

export function getPantryRow(ingredientId: string): Promise<PantryRow | undefined> {
  return db.pantry.get(ingredientId);
}

/** Marks an ingredient as available / not available. Staple flag is preserved. */
export async function setAvailable(ingredientId: string, available: boolean): Promise<void> {
  await db.transaction("rw", db.pantry, async () => {
    const row = await db.pantry.get(ingredientId);
    if (!available && !row?.isStaple) {
      await db.pantry.delete(ingredientId);
      return;
    }
    await db.pantry.put({
      ingredientId,
      available,
      isStaple: row?.isStaple ?? false,
      updatedAt: Date.now(),
    });
  });
}

export async function toggleAvailable(ingredientId: string): Promise<boolean> {
  const row = await db.pantry.get(ingredientId);
  const next = !(row?.available ?? false);
  await setAvailable(ingredientId, next);
  return next;
}

/** "نفد": the item ran out. Staples keep their pin so they are easy to restore. */
export function markRanOut(ingredientId: string): Promise<void> {
  return setAvailable(ingredientId, false);
}

/** Pins / unpins an ingredient as a staple. Pinning also makes it available. */
export async function setStaple(ingredientId: string, isStaple: boolean): Promise<void> {
  await db.transaction("rw", db.pantry, async () => {
    const row = await db.pantry.get(ingredientId);
    const available = isStaple ? true : (row?.available ?? false);
    if (!isStaple && !available) {
      await db.pantry.delete(ingredientId);
      return;
    }
    await db.pantry.put({ ingredientId, available, isStaple, updatedAt: Date.now() });
  });
}

/**
 * Used by onboarding: the given ids become available staples; previously
 * pinned staples that are no longer selected are unpinned and removed.
 * Non-staple pantry items are left untouched.
 */
export async function replaceStaples(ingredientIds: string[]): Promise<void> {
  const selected = new Set(ingredientIds);
  const now = Date.now();
  await db.transaction("rw", db.pantry, async () => {
    const rows = await db.pantry.toArray();
    const toDelete = rows.filter((r) => r.isStaple && !selected.has(r.ingredientId));
    await db.pantry.bulkDelete(toDelete.map((r) => r.ingredientId));
    await db.pantry.bulkPut(
      ingredientIds.map((ingredientId) => ({
        ingredientId,
        available: true,
        isStaple: true,
        updatedAt: now,
      })),
    );
  });
}

export function listCustomIngredients(): Promise<CustomIngredient[]> {
  return db.customIngredients.toArray();
}

/** Adds a user-defined ingredient and marks it available right away. */
export async function addCustomIngredient(input: {
  name: string;
  category: IngredientCategory;
  groups?: string[];
}): Promise<CustomIngredient> {
  const ingredient = customIngredientSchema.parse({
    id: `custom-${crypto.randomUUID()}`,
    name: input.name,
    category: input.category,
    ...(input.groups?.length ? { groups: input.groups } : {}),
  });
  await db.transaction("rw", db.customIngredients, db.pantry, async () => {
    await db.customIngredients.add(ingredient);
    await db.pantry.put({
      ingredientId: ingredient.id,
      available: true,
      isStaple: false,
      updatedAt: Date.now(),
    });
  });
  return ingredient;
}

export async function deleteCustomIngredient(id: string): Promise<void> {
  await db.transaction("rw", db.customIngredients, db.pantry, async () => {
    await db.customIngredients.delete(id);
    await db.pantry.delete(id);
  });
}
