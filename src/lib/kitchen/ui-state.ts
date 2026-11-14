"use client";

import { useSyncExternalStore } from "react";
import type { Day } from "@/lib/matching/matchRecipes";
import type { TimeBucket } from "@/lib/matching/timeBucket";
import type { Course, Cuisine, Difficulty } from "@/lib/schemas/recipe";

// Tiny in-memory stores for view state that should survive navigating to a
// recipe and back (selected day, active filters). Not persisted: a fresh app
// start always begins from "today" with no filters.

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T | ((previous: T) => T)) => {
      state = typeof next === "function" ? (next as (previous: T) => T)(state) : next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    initial,
  };
}

function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  const state = useSyncExternalStore(store.subscribe, store.get, () => store.initial);
  return [state, store.set] as const;
}

/** "نباتي" in the UI covers both vegetarian and vegan recipes. */
export type MealChip = "meat" | "chicken" | "fish" | "veg";

export interface HomeFilters {
  course: Course[];
  time: TimeBucket[];
  difficulty: Difficulty[];
  meal: MealChip[];
}

export interface BrowseFilters extends HomeFilters {
  cuisine: Cuisine[];
  favoritesOnly: boolean;
  showUnsuitable: boolean;
  query: string;
}

const dayStore = createStore<Day>("today");
/** No filter selected. */
export const EMPTY_FILTERS: HomeFilters = { course: [], time: [], difficulty: [], meal: [] };

const homeFiltersStore = createStore<HomeFilters>(EMPTY_FILTERS);
const browseFiltersStore = createStore<BrowseFilters>({
  ...EMPTY_FILTERS,
  cuisine: [],
  favoritesOnly: false,
  showUnsuitable: false,
  query: "",
});

// Order of the home suggestions. A new seed for every visit: when the app
// opens and each time the «اقتراحات» tab is tapped. Coming back from a recipe
// keeps the seed, so the list is where the user left it.
const visitSeedStore = createStore<string>("0");

export function newVisit(): void {
  visitSeedStore.set(Math.random().toString(36).slice(2));
}
if (typeof window !== "undefined") newVisit();

export const useVisitSeed = (): string => useStore(visitSeedStore)[0];
export const useSelectedDay = () => useStore(dayStore);
export const useHomeFilters = () => useStore(homeFiltersStore);
export const useBrowseFilters = () => useStore(browseFiltersStore);

/** Adds the value if absent, removes it if present. */
export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const MEAL_CHIP_TYPES = {
  meat: ["meat"],
  chicken: ["chicken"],
  fish: ["fish"],
  veg: ["vegetarian", "vegan"],
} as const;

export function mealChipsToTypes(chips: readonly MealChip[]) {
  return chips.flatMap((chip) => [...MEAL_CHIP_TYPES[chip]]);
}
