"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getAiRecipe, listAiRecipes } from "./repositories/aiRecipes";
import { getPlan } from "./repositories/dayPlan";
import { listEquipment } from "./repositories/equipment";
import { listFavorites } from "./repositories/favorites";
import { listCustomIngredients, listPantry } from "./repositories/pantry";
import { getAllSettings } from "./repositories/settings";

// Reactive reads. Every hook returns `undefined` while IndexedDB is loading
// (and during prerendering), then re-renders whenever the data changes.

export function usePantryRows() {
  return useLiveQuery(listPantry, []);
}

export function useCustomIngredients() {
  return useLiveQuery(listCustomIngredients, []);
}

export function useEquipmentRows() {
  return useLiveQuery(listEquipment, []);
}

export function useSettings() {
  return useLiveQuery(getAllSettings, []);
}

export function useFavorites() {
  return useLiveQuery(listFavorites, []);
}

export function useFavoriteIds(): Set<string> | undefined {
  const rows = useFavorites();
  return rows ? new Set(rows.map((r) => r.recipeId)) : undefined;
}

/** `null` = loaded and no plan for that date; `undefined` = still loading. */
export function useDayPlan(date: string) {
  return useLiveQuery(async () => (await getPlan(date)) ?? null, [date]);
}

export function useAiRecipes() {
  return useLiveQuery(listAiRecipes, []);
}

/** `null` = loaded and not found; `undefined` = still loading. */
export function useAiRecipe(id: string | null) {
  return useLiveQuery(async () => (id ? ((await getAiRecipe(id)) ?? null) : null), [id]);
}
