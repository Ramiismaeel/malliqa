import { describe, expect, it } from "vitest";
import type { Course, Recipe } from "@/lib/schemas/recipe";
import { arrangeForDay, groupByCourse } from "./arrange";
import { matchRecipes, type MatchResult } from "./matchRecipes";

function recipe(id: string, course?: Course, ingredients: string[] = ["salt"]): Recipe {
  return {
    id,
    name: id,
    description: "test",
    cuisine: "other",
    mealType: "vegan",
    ...(course ? { course } : {}),
    difficulty: "easy",
    prepMinutes: 10,
    cookMinutes: 10,
    servings: 2,
    ingredients: ingredients.map((ref) => ({ ref, role: "required" as const })),
    equipment: [],
    steps: ["step one"],
    source: "builtin",
  };
}

function match(recipes: Recipe[], available: string[] = ["salt"]): MatchResult[] {
  return matchRecipes({
    recipes,
    availableIngredientIds: new Set(available),
    stapleIds: new Set(available),
    capabilities: new Set(),
    ingredientGroups: new Map(),
    day: "tomorrow",
  });
}

const ids = (results: MatchResult[]) => results.map((result) => result.recipe.id);
const courses = (results: MatchResult[]) => results.map((result) => result.recipe.course ?? "main");

const mains = Array.from({ length: 12 }, (_, index) => recipe(`main-${index}`, "main"));
const mixed = [
  recipe("cake", "dessert"),
  recipe("salad", "appetizer"),
  ...mains,
  recipe("dip", "appetizer"),
  recipe("pudding", "dessert"),
  recipe("ai-dish"),
];

describe("groupByCourse", () => {
  it("puts main dishes first, then appetizers, then desserts", () => {
    expect(courses(groupByCourse(match(mixed)))).toEqual([
      ...Array.from({ length: 13 }, () => "main"),
      "appetizer",
      "appetizer",
      "dessert",
      "dessert",
    ]);
  });

  it("keeps the engine's ranking inside each course", () => {
    const ranked = match(mixed);
    const grouped = groupByCourse(ranked);
    for (const course of ["main", "appetizer", "dessert"]) {
      const pick = (results: MatchResult[]) => ids(results.filter((r) => (r.recipe.course ?? "main") === course));
      expect(pick(grouped)).toEqual(pick(ranked));
    }
  });
});

describe("arrangeForDay", () => {
  it("keeps the course order whatever the seed", () => {
    for (const seed of ["2026-11-13", "2026-11-14", "2027-01-01"]) {
      const arranged = arrangeForDay(match(mixed), seed);
      expect(courses(arranged).slice(0, 13)).toEqual(Array.from({ length: 13 }, () => "main"));
      expect(courses(arranged).slice(13)).toEqual(["appetizer", "appetizer", "dessert", "dessert"]);
    }
  });

  it("gives the same order for the same day, whatever order the results came in", () => {
    const results = match(mixed);
    const once = ids(arrangeForDay(results, "2026-11-13"));
    expect(ids(arrangeForDay(results, "2026-11-13"))).toEqual(once);
    expect(ids(arrangeForDay([...results].reverse(), "2026-11-13"))).toEqual(once);
  });

  it("changes the order of main dishes from one day to the next", () => {
    const results = match(mains);
    const days = ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"];
    const orders = new Set(days.map((day) => ids(arrangeForDay(results, day)).join()));
    const firsts = new Set(days.map((day) => ids(arrangeForDay(results, day))[0]));
    expect(orders.size).toBe(days.length);
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("does not reorder the other recipes when one leaves the list", () => {
    const all = ids(arrangeForDay(match(mains), "2026-11-13"));
    const without = ids(arrangeForDay(match(mains.filter((r) => r.id !== all[0])), "2026-11-13"));
    expect(without).toEqual(all.slice(1));
  });

  it("puts recipes with fewer missing ingredients first inside a course", () => {
    const recipes = [
      recipe("two-missing", "main", ["salt", "a", "b"]),
      recipe("one-missing", "main", ["salt", "a"]),
      recipe("salad-ready", "appetizer"),
      recipe("ready", "main"),
    ];
    for (const seed of ["a", "b", "c", "d"]) {
      expect(ids(arrangeForDay(match(recipes), seed))).toEqual(["ready", "one-missing", "two-missing", "salad-ready"]);
    }
  });

  it("does not change its input", () => {
    const results = match(mixed);
    const before = ids(results);
    arrangeForDay(results, "2026-11-13");
    groupByCourse(results);
    expect(ids(results)).toEqual(before);
  });
});
