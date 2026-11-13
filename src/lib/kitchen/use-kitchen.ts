"use client";

import { useMemo } from "react";
import { capabilitiesOf } from "@/data/equipment";
import { builtinIngredientGroups } from "@/data/ingredients";
import { allRecipes } from "@/data/recipes";
import {
  useAiRecipes,
  useCustomIngredients,
  useEquipmentRows,
  usePantryRows,
  useSettings,
} from "@/lib/db/hooks";
import type { SettingsMap } from "@/lib/db/repositories/settings";
import {
  matchRecipes,
  type Day,
  type MatchFilters,
  type MatchResult,
} from "@/lib/matching/matchRecipes";
import { customRefKey } from "@/lib/matching/resolveAvailability";
import type { AiRecipeRow, CustomIngredient, PantryRow } from "@/lib/schemas/backup";
import type { Capability } from "@/lib/schemas/equipment";
import type { Recipe } from "@/lib/schemas/recipe";
import { createRefResolver, type RefResolver } from "./names";

export interface Kitchen {
  pantryRows: PantryRow[];
  customIngredients: CustomIngredient[];
  /** Available pantry ids (staples included) + keys for free-text AI refs. */
  availableIds: Set<string>;
  /** Staples that are currently available. */
  stapleIds: Set<string>;
  capabilities: Set<Capability>;
  equipmentIds: Set<string>;
  ingredientGroups: Map<string, readonly string[]>;
  /** Built-in recipes + saved AI recipes. */
  recipes: Recipe[];
  aiRecipes: AiRecipeRow[];
  settings: SettingsMap;
  /** Number of available items that are not staples. */
  freshCount: number;
  resolveRef: RefResolver;
}

/**
 * Everything the matching engine needs, read reactively from Dexie.
 * Returns `undefined` until IndexedDB has answered.
 */
export function useKitchen(): Kitchen | undefined {
  const pantryRows = usePantryRows();
  const customIngredients = useCustomIngredients();
  const equipmentRows = useEquipmentRows();
  const aiRecipes = useAiRecipes();
  const settings = useSettings();

  return useMemo(() => {
    if (!pantryRows || !customIngredients || !equipmentRows || !aiRecipes || !settings) return undefined;

    const availableIds = new Set<string>();
    const stapleIds = new Set<string>();
    for (const row of pantryRows) {
      if (!row.available) continue;
      availableIds.add(row.ingredientId);
      if (row.isStaple) stapleIds.add(row.ingredientId);
    }
    const freshCount = availableIds.size - stapleIds.size;

    const ingredientGroups = new Map<string, readonly string[]>(builtinIngredientGroups);
    for (const custom of customIngredients) {
      if (custom.groups?.length) ingredientGroups.set(custom.id, custom.groups);
      // Lets saved AI recipes that mention this ingredient by name match it.
      if (availableIds.has(custom.id)) {
        const key = customRefKey(custom.name);
        availableIds.add(key);
        if (stapleIds.has(custom.id)) stapleIds.add(key);
      }
    }

    const equipmentIds = new Set(equipmentRows.filter((r) => r.available).map((r) => r.equipmentId));

    return {
      pantryRows,
      customIngredients,
      availableIds,
      stapleIds,
      capabilities: capabilitiesOf(equipmentIds),
      equipmentIds,
      ingredientGroups,
      recipes: [...allRecipes, ...aiRecipes],
      aiRecipes,
      settings,
      freshCount,
      resolveRef: createRefResolver(customIngredients),
    };
  }, [pantryRows, customIngredients, equipmentRows, aiRecipes, settings]);
}

/** Runs the matching engine over the whole kitchen. */
export function useMatches(
  kitchen: Kitchen | undefined,
  day: Day,
  filters?: MatchFilters,
): MatchResult[] | undefined {
  return useMemo(() => {
    if (!kitchen) return undefined;
    return matchRecipes({
      recipes: kitchen.recipes,
      availableIngredientIds: kitchen.availableIds,
      stapleIds: kitchen.stapleIds,
      capabilities: kitchen.capabilities,
      ingredientGroups: kitchen.ingredientGroups,
      day,
      filters,
      excludedMealTypes: kitchen.settings.excludedMealTypes,
    });
  }, [kitchen, day, filters]);
}

/** Matches a single recipe (detail pages). Ignores filters and exclusions. */
export function useRecipeMatch(
  kitchen: Kitchen | undefined,
  recipe: Recipe | null | undefined,
  day: Day,
): MatchResult | undefined {
  return useMemo(() => {
    if (!kitchen || !recipe) return undefined;
    return matchRecipes({
      recipes: [recipe],
      availableIngredientIds: kitchen.availableIds,
      stapleIds: kitchen.stapleIds,
      capabilities: kitchen.capabilities,
      ingredientGroups: kitchen.ingredientGroups,
      day,
    })[0];
  }, [kitchen, recipe, day]);
}
