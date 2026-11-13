import { describe, expect, it } from "vitest";
import { capabilitiesOf } from "@/data/equipment";
import { builtinIngredientGroups } from "@/data/ingredients";
import { allRecipes } from "@/data/recipes";
import type { Capability } from "@/lib/schemas/equipment";
import type { Recipe } from "@/lib/schemas/recipe";
import {
  compareMatches,
  matchRecipes,
  toSections,
  type MatchInput,
  type MatchResult,
} from "./matchRecipes";
import { buildAvailability, customRefKey, resolveRef } from "./resolveAvailability";
import { timeBucketOf, totalMinutes } from "./timeBucket";

// ── helpers ──────────────────────────────────────────────────────────────

function recipe(overrides: Partial<Recipe> & Pick<Recipe, "id">): Recipe {
  return {
    name: overrides.id,
    description: "test",
    cuisine: "other",
    mealType: "vegan",
    difficulty: "easy",
    prepMinutes: 10,
    cookMinutes: 10,
    servings: 2,
    ingredients: [{ ref: "salt", role: "required" }],
    equipment: [{ cap: "stovetop", role: "required" }],
    steps: ["step one"],
    source: "builtin",
    ...overrides,
  };
}

function run(
  recipes: Recipe[],
  options: {
    fresh?: string[];
    staples?: string[];
    caps?: Capability[];
    groups?: Map<string, string[]>;
  } & Partial<Pick<MatchInput, "day" | "filters" | "excludedMealTypes">> = {},
): MatchResult[] {
  const staples = options.staples ?? [];
  return matchRecipes({
    recipes,
    availableIngredientIds: new Set([...(options.fresh ?? []), ...staples]),
    stapleIds: new Set(staples),
    capabilities: new Set(options.caps ?? ["stovetop"]),
    ingredientGroups: options.groups ?? builtinIngredientGroups,
    day: options.day ?? "tomorrow",
    filters: options.filters,
    excludedMealTypes: options.excludedMealTypes,
  });
}

function byId(results: MatchResult[], id: string): MatchResult {
  const found = results.find((r) => r.recipe.id === id);
  if (!found) throw new Error(`recipe ${id} not in results`);
  return found;
}

// ── golden test (CLAUDE.md §5) ───────────────────────────────────────────

describe("golden test", () => {
  const fresh = ["onion", "butter", "pasta", "tomato-juice", "minced-meat"];
  // The spec's staples + bulgur and flour, which the owner confirmed as staples.
  const staples = [
    "salt",
    "black-pepper",
    "mixed-spices",
    "vegetable-oil",
    "garlic",
    "dry-coriander",
    "bread",
    "rice",
    "bulgur",
    "flour",
  ];
  const results = matchRecipes({
    recipes: allRecipes,
    availableIngredientIds: new Set([...fresh, ...staples]),
    stapleIds: new Set(staples),
    capabilities: capabilitiesOf(["stove"]),
    ingredientGroups: builtinIngredientGroups,
    day: "today",
  });

  it("spaghetti bolognese is ready and uses at least 4 fresh items", () => {
    const bolognese = byId(results, "spaghetti-bolognese");
    expect(bolognese.status).toBe("ready");
    expect(bolognese.missing).toEqual([]);
    expect(bolognese.freshUsed).toBeGreaterThanOrEqual(4);
    expect(bolognese.matchPercent).toBe(100);
    expect(bolognese.viaGroup).toEqual(
      expect.arrayContaining([
        { ref: "group:tomato-base", ingredientId: "tomato-juice" },
        { ref: "group:pasta-any", ingredientId: "pasta" },
      ]),
    );
  });

  it("bolognese ranks above rice with vermicelli", () => {
    const ids = results.map((r) => r.recipe.id);
    expect(ids.indexOf("spaghetti-bolognese")).toBeLessThan(ids.indexOf("rice-with-vermicelli"));
  });

  it("bolognese still ranks above rice with vermicelli when both are ready", () => {
    const withVermicelli = matchRecipes({
      recipes: allRecipes,
      availableIngredientIds: new Set([...fresh, ...staples, "vermicelli"]),
      stapleIds: new Set([...staples, "vermicelli"]),
      capabilities: capabilitiesOf(["stove"]),
      ingredientGroups: builtinIngredientGroups,
      day: "today",
    });
    const rice = byId(withVermicelli, "rice-with-vermicelli");
    const bolognese = byId(withVermicelli, "spaghetti-bolognese");
    expect(rice.status).toBe("ready");
    // Butter is the only fresh item rice can use (as its cooking fat).
    expect(rice.freshUsed).toBe(1);
    expect(bolognese.freshUsed).toBeGreaterThan(rice.freshUsed);
    const ids = withVermicelli.map((r) => r.recipe.id);
    expect(ids.indexOf("spaghetti-bolognese")).toBeLessThan(ids.indexOf("rice-with-vermicelli"));
  });

  it("a staples-only recipe uses no fresh items", () => {
    const [rice] = matchRecipes({
      recipes: allRecipes.filter((r) => r.id === "rice-with-vermicelli"),
      availableIngredientIds: new Set([...staples, "vermicelli", "minced-meat"]),
      stapleIds: new Set([...staples, "vermicelli"]),
      capabilities: capabilitiesOf(["stove"]),
      ingredientGroups: builtinIngredientGroups,
      day: "today",
    });
    expect(rice.status).toBe("ready");
    expect(rice.freshUsed).toBe(0);
  });

  it("baked pasta is unsuitable without an oven", () => {
    const baked = byId(results, "baked-pasta-with-meat");
    expect(baked.status).toBe("unsuitable");
    expect(baked.missingEquipment).toEqual(["oven"]);
  });

  it("stovetop béchamel pasta is almost ready, missing only milk", () => {
    const bechamel = byId(results, "stovetop-bechamel-pasta");
    expect(bechamel.status).toBe("almost");
    expect(bechamel.missing).toEqual(["milk"]);
  });

  it("no recipe that needs missing equipment is ever ready", () => {
    for (const result of results) {
      if (result.missingEquipment.length > 0) expect(result.status).toBe("unsuitable");
    }
    const sections = toSections(results);
    expect(sections.ready.every((r) => r.missingEquipment.length === 0)).toBe(true);
    expect(sections.ready.map((r) => r.recipe.id)).toContain("spaghetti-bolognese");
    expect(sections.unsuitable.map((r) => r.recipe.id)).toContain("baked-pasta-with-meat");
  });
});

// ── groups ───────────────────────────────────────────────────────────────

describe("ingredient groups", () => {
  const tomatoDish = recipe({
    id: "tomato-dish",
    ingredients: [{ ref: "group:tomato-base", role: "required" }],
  });

  it("any member of the group satisfies it", () => {
    for (const member of ["tomato", "tomato-juice", "tomato-paste", "passata", "canned-tomatoes"]) {
      const [result] = run([tomatoDish], { fresh: [member] });
      expect(result.status, member).toBe("ready");
      expect(result.viaGroup).toEqual([{ ref: "group:tomato-base", ingredientId: member }]);
    }
  });

  it("is missing when no member is available", () => {
    const [result] = run([tomatoDish], { fresh: ["onion"] });
    expect(result.status).toBe("almost");
    expect(result.missing).toEqual(["group:tomato-base"]);
  });

  it("prefers a fresh member over a staple one", () => {
    const [result] = run([tomatoDish], { fresh: ["tomato-juice"], staples: ["tomato-paste"] });
    expect(result.viaGroup[0].ingredientId).toBe("tomato-juice");
    expect(result.freshUsed).toBe(1);
  });

  it("falls back to the staple member and then counts nothing as fresh", () => {
    const [result] = run([tomatoDish], { staples: ["tomato-paste"] });
    expect(result.status).toBe("ready");
    expect(result.freshUsed).toBe(0);
  });

  it("an ingredient that belongs to two groups satisfies both", () => {
    const cheeseDish = recipe({
      id: "cheese-dish",
      ingredients: [
        { ref: "group:cheese-white", role: "required" },
        { ref: "group:cheese-melting", role: "required" },
      ],
    });
    const [result] = run([cheeseDish], { fresh: ["akkawi"] });
    expect(result.status).toBe("ready");
    expect(result.freshUsed).toBe(1);
  });
});

// ── substitutes ──────────────────────────────────────────────────────────

describe("substitutes", () => {
  const dish = recipe({
    id: "sub-dish",
    ingredients: [
      { ref: "minced-meat", role: "required" },
      { ref: "onion", role: "required" },
    ],
    substitutes: [
      { for: "minced-meat", use: ["minced-chicken", "group:red-meat-cubes"], note: "lighter" },
    ],
  });

  it("counts a missing ingredient as available via its substitute", () => {
    const [result] = run([dish], { fresh: ["minced-chicken", "onion"] });
    expect(result.status).toBe("ready");
    expect(result.missing).toEqual([]);
    expect(result.viaSubstitute).toEqual([
      { ref: "minced-meat", ingredientId: "minced-chicken", note: "lighter" },
    ]);
    expect(result.freshUsed).toBe(2);
  });

  it("accepts a group as a substitute", () => {
    const [result] = run([dish], { fresh: ["beef-cubes", "onion"] });
    expect(result.viaSubstitute[0]).toMatchObject({ ref: "minced-meat", ingredientId: "beef-cubes" });
  });

  it("does not use the substitute when the original is available", () => {
    const [result] = run([dish], { fresh: ["minced-meat", "minced-chicken", "onion"] });
    expect(result.viaSubstitute).toEqual([]);
  });

  it("is missing when neither the ingredient nor a substitute is available", () => {
    const [result] = run([dish], { fresh: ["onion"] });
    expect(result.missing).toEqual(["minced-meat"]);
    expect(result.status).toBe("almost");
  });

  it("omits the note when the substitute has none", () => {
    const noNote = recipe({
      id: "no-note",
      ingredients: [{ ref: "butter", role: "required" }],
      substitutes: [{ for: "butter", use: ["ghee"] }],
    });
    const [result] = run([noNote], { fresh: ["ghee"] });
    expect(result.viaSubstitute).toEqual([{ ref: "butter", ingredientId: "ghee" }]);
  });
});

// ── status & optional ingredients ────────────────────────────────────────

describe("status and optional ingredients", () => {
  const dish = recipe({
    id: "status-dish",
    ingredients: [
      { ref: "a", role: "required" },
      { ref: "b", role: "required" },
      { ref: "c", role: "required" },
      { ref: "d", role: "required" },
      { ref: "parmesan", role: "optional" },
      { ref: "group:fresh-herbs", role: "optional" },
    ],
  });

  it.each([
    [["a", "b", "c", "d"], "ready", 100],
    [["a", "b", "c"], "almost", 75],
    [["a", "b"], "almost", 50],
    [["a"], "shopping", 25],
    [[], "shopping", 0],
  ] as const)("with %j the status is %s", (fresh, status, percent) => {
    const [result] = run([dish], { fresh: [...fresh] });
    expect(result.status).toBe(status);
    expect(result.matchPercent).toBe(percent);
  });

  it("optional ingredients never change the status", () => {
    const [without] = run([dish], { fresh: ["a", "b", "c", "d"] });
    expect(without.status).toBe("ready");
    expect(without.optionalMissing).toEqual(["parmesan", "group:fresh-herbs"]);

    const [withOptional] = run([dish], { fresh: ["a", "b", "c", "d", "parmesan", "parsley"] });
    expect(withOptional.status).toBe("ready");
    expect(withOptional.optionalMissing).toEqual([]);
    expect(withOptional.freshUsed).toBe(6);
  });

  it("freshUsed ignores staples and never double counts an ingredient", () => {
    const fatDish = recipe({
      id: "fat-dish",
      ingredients: [
        { ref: "group:cooking-fat", role: "required" },
        { ref: "butter", role: "optional" },
        { ref: "salt", role: "required" },
      ],
    });
    const [result] = run([fatDish], { fresh: ["butter"], staples: ["salt", "vegetable-oil"] });
    expect(result.freshUsed).toBe(1);
  });

  it("a recipe with only optional ingredients is 100% matched", () => {
    const loose = recipe({ id: "loose", ingredients: [{ ref: "parsley", role: "optional" }] });
    const [result] = run([loose]);
    expect(result.matchPercent).toBe(100);
    expect(result.status).toBe("ready");
  });
});

// ── equipment ────────────────────────────────────────────────────────────

describe("equipment", () => {
  const ovenDish = recipe({
    id: "oven-dish",
    equipment: [
      { cap: "oven", role: "required" },
      { cap: "stand-mixer", role: "optional" },
    ],
  });

  it("a missing required capability makes the recipe unsuitable", () => {
    const [result] = run([ovenDish], { fresh: ["salt"], caps: ["stovetop"] });
    expect(result.status).toBe("unsuitable");
    expect(result.missingEquipment).toEqual(["oven"]);
    expect(result.missing).toEqual([]);
  });

  it("optional equipment is never required", () => {
    const [result] = run([ovenDish], { fresh: ["salt"], caps: ["oven"] });
    expect(result.status).toBe("ready");
    expect(result.missingEquipment).toEqual([]);
  });

  it("the stove provides the stovetop capability", () => {
    expect(capabilitiesOf(["stove"]).has("stovetop")).toBe(true);
    // Ids from before the two stoves were merged still work.
    expect(capabilitiesOf(["gas-stove"]).has("stovetop")).toBe(true);
    expect(capabilitiesOf(["electric-hob"]).has("stovetop")).toBe(true);
    expect(capabilitiesOf(["unknown-device"]).size).toBe(0);
  });

  it("a recipe with no equipment works in an empty kitchen", () => {
    const salad = recipe({ id: "salad", equipment: [] });
    const [result] = run([salad], { fresh: ["salt"], caps: [] });
    expect(result.status).toBe("ready");
  });
});

// ── today / tomorrow ─────────────────────────────────────────────────────

describe("today and tomorrow", () => {
  const soaked = recipe({
    id: "soaked",
    advancePrep: { kind: "soak", hours: 8 },
    ingredients: [{ ref: "white-beans", role: "required" }],
  });
  const plain = recipe({ id: "plain", ingredients: [{ ref: "white-beans", role: "required" }] });

  it("today: advance-prep recipes keep their status but are flagged", () => {
    const results = run([soaked, plain], { fresh: ["white-beans"], day: "today" });
    expect(byId(results, "soaked")).toMatchObject({ status: "ready", needsAdvancePrep: true });
    expect(byId(results, "plain").needsAdvancePrep).toBe(false);

    const sections = toSections(results);
    expect(sections.ready.map((r) => r.recipe.id)).toEqual(["plain"]);
    expect(sections.prepTonight.map((r) => r.recipe.id)).toEqual(["soaked"]);
  });

  it("tomorrow: advance-prep recipes are normal", () => {
    const results = run([soaked, plain], { fresh: ["white-beans"], day: "tomorrow" });
    expect(byId(results, "soaked").needsAdvancePrep).toBe(false);
    const sections = toSections(results);
    expect(sections.ready).toHaveLength(2);
    expect(sections.prepTonight).toHaveLength(0);
  });

  it("sections keep shopping and unsuitable recipes out of 'prep tonight'", () => {
    const shoppingSoak = recipe({
      id: "shopping-soak",
      advancePrep: { kind: "marinate", hours: 4 },
      ingredients: [
        { ref: "x1", role: "required" },
        { ref: "x2", role: "required" },
        { ref: "x3", role: "required" },
      ],
    });
    const ovenSoak = recipe({
      id: "oven-soak",
      advancePrep: { kind: "rise", hours: 1 },
      equipment: [{ cap: "oven", role: "required" }],
    });
    const almostDish = recipe({ id: "almost-dish", ingredients: [{ ref: "x1", role: "required" }] });
    const sections = toSections(run([shoppingSoak, ovenSoak, almostDish], { day: "today", fresh: ["salt"] }));
    expect(sections.shopping.map((r) => r.recipe.id)).toEqual(["shopping-soak"]);
    expect(sections.unsuitable.map((r) => r.recipe.id)).toEqual(["oven-soak"]);
    expect(sections.almost.map((r) => r.recipe.id)).toEqual(["almost-dish"]);
    expect(sections.prepTonight).toEqual([]);
  });
});

// ── filters ──────────────────────────────────────────────────────────────

describe("filters", () => {
  const recipes = [
    recipe({ id: "quick-vegan", prepMinutes: 5, cookMinutes: 10, mealType: "vegan", cuisine: "syrian" }),
    recipe({ id: "medium-meat", prepMinutes: 20, cookMinutes: 30, mealType: "meat", cuisine: "italian", difficulty: "medium" }),
    recipe({ id: "long-chicken", prepMinutes: 30, cookMinutes: 60, mealType: "chicken", cuisine: "asian", difficulty: "hard" }),
  ];
  const ids = (results: MatchResult[]) => results.map((r) => r.recipe.id).sort();

  it("filters by time bucket", () => {
    expect(ids(run(recipes, { filters: { time: ["quick"] } }))).toEqual(["quick-vegan"]);
    expect(ids(run(recipes, { filters: { time: ["medium", "long"] } }))).toEqual(["long-chicken", "medium-meat"]);
  });

  it("filters by difficulty, meal type and cuisine", () => {
    expect(ids(run(recipes, { filters: { difficulty: ["hard"] } }))).toEqual(["long-chicken"]);
    expect(ids(run(recipes, { filters: { mealType: ["meat", "chicken"] } }))).toEqual(["long-chicken", "medium-meat"]);
    expect(ids(run(recipes, { filters: { cuisine: ["syrian"] } }))).toEqual(["quick-vegan"]);
  });

  it("filters by course; a recipe without a course counts as a main dish", () => {
    const dishes = [
      recipe({ id: "stew", course: "main" }),
      recipe({ id: "salad", course: "appetizer" }),
      recipe({ id: "cake", course: "dessert" }),
      recipe({ id: "ai-dish" }),
    ];
    expect(ids(run(dishes, { filters: { course: ["main"] } }))).toEqual(["ai-dish", "stew"]);
    expect(ids(run(dishes, { filters: { course: ["appetizer", "dessert"] } }))).toEqual(["cake", "salad"]);
  });

  it("combines filters with AND and ignores empty arrays", () => {
    expect(ids(run(recipes, { filters: { time: ["long"], mealType: ["meat"] } }))).toEqual([]);
    expect(ids(run(recipes, { filters: { time: [], difficulty: [] } }))).toHaveLength(3);
  });

  it("drops excluded meal types from settings", () => {
    expect(ids(run(recipes, { excludedMealTypes: ["meat", "chicken"] }))).toEqual(["quick-vegan"]);
  });

  it("computes time buckets at the boundaries", () => {
    expect(timeBucketOf({ prepMinutes: 10, cookMinutes: 20 })).toBe("quick");
    expect(timeBucketOf({ prepMinutes: 11, cookMinutes: 20 })).toBe("medium");
    expect(timeBucketOf({ prepMinutes: 30, cookMinutes: 30 })).toBe("medium");
    expect(timeBucketOf({ prepMinutes: 31, cookMinutes: 30 })).toBe("long");
    expect(totalMinutes({ prepMinutes: 7, cookMinutes: 8 })).toBe(15);
  });
});

// ── ranking ──────────────────────────────────────────────────────────────

describe("ranking", () => {
  it("orders by status: ready, almost, shopping, unsuitable", () => {
    const recipes = [
      recipe({ id: "unsuitable", equipment: [{ cap: "oven", role: "required" }] }),
      recipe({
        id: "shopping",
        ingredients: ["m1", "m2", "m3"].map((ref) => ({ ref, role: "required" as const })),
      }),
      recipe({ id: "almost", ingredients: [{ ref: "m1", role: "required" }] }),
      recipe({ id: "ready" }),
    ];
    const results = run(recipes, { fresh: ["salt"] });
    expect(results.map((r) => r.recipe.id)).toEqual(["ready", "almost", "shopping", "unsuitable"]);
  });

  it("within a status: fewer missing first", () => {
    const recipes = [
      recipe({ id: "two-missing", ingredients: [{ ref: "m1", role: "required" }, { ref: "m2", role: "required" }] }),
      recipe({ id: "one-missing", ingredients: [{ ref: "m1", role: "required" }] }),
    ];
    expect(run(recipes).map((r) => r.recipe.id)).toEqual(["one-missing", "two-missing"]);
  });

  it("then more fresh items used first — not match percent", () => {
    const stapleOnly = recipe({ id: "staple-only", prepMinutes: 1, cookMinutes: 1, ingredients: [{ ref: "rice", role: "required" }] });
    const usesFresh = recipe({
      id: "uses-fresh",
      prepMinutes: 30,
      cookMinutes: 60,
      ingredients: [{ ref: "rice", role: "required" }, { ref: "minced-meat", role: "required" }],
    });
    const results = run([stapleOnly, usesFresh], { staples: ["rice"], fresh: ["minced-meat"] });
    expect(results.map((r) => r.recipe.id)).toEqual(["uses-fresh", "staple-only"]);
  });

  it("then shorter recipes first, then by name", () => {
    const slow = recipe({ id: "slow", name: "ب", prepMinutes: 20, cookMinutes: 40 });
    const fast = recipe({ id: "fast", name: "ت", prepMinutes: 5, cookMinutes: 5 });
    const fastToo = recipe({ id: "fast-too", name: "أ", prepMinutes: 5, cookMinutes: 5 });
    const results = run([slow, fast, fastToo], { staples: ["salt"] });
    expect(results.map((r) => r.recipe.id)).toEqual(["fast-too", "fast", "slow"]);
    expect(compareMatches(results[0], results[0])).toBe(0);
  });
});

// ── custom ingredients ───────────────────────────────────────────────────

describe("custom ingredients", () => {
  it("a custom pantry id satisfies a recipe that references it", () => {
    const dish = recipe({ id: "custom-dish", ingredients: [{ ref: "custom-123", role: "required" }] });
    expect(run([dish], { fresh: ["custom-123"] })[0].status).toBe("ready");
    expect(run([dish])[0].status).toBe("almost");
  });

  it("a custom ingredient with a group satisfies that group", () => {
    const dish = recipe({ id: "group-dish", ingredients: [{ ref: "group:tomato-base", role: "required" }] });
    const groups = new Map<string, string[]>([["custom-sauce", ["tomato-base"]]]);
    const [result] = run([dish], { fresh: ["custom-sauce"], groups });
    expect(result.status).toBe("ready");
    expect(result.viaGroup).toEqual([{ ref: "group:tomato-base", ingredientId: "custom-sauce" }]);
  });

  it("free-text AI refs match custom ingredients by normalized name", () => {
    const aiDish = recipe({
      id: "ai-dish",
      source: "ai",
      ingredients: [{ ref: "custom:دبس الخرّوب", role: "required" }],
    });
    const key = customRefKey("دبس خروب");
    expect(key).toBe(customRefKey("دبس الخرّوب"));
    expect(run([aiDish], { fresh: [key] })[0].status).toBe("ready");
    expect(run([aiDish])[0].missing).toEqual(["custom:دبس الخرّوب"]);
  });
});

// ── resolveAvailability ──────────────────────────────────────────────────

describe("resolveAvailability", () => {
  it("resolves direct, group and missing refs", () => {
    const availability = buildAvailability({
      availableIngredientIds: new Set(["onion", "olive-oil", "butter"]),
      stapleIds: new Set(["olive-oil"]),
      ingredientGroups: builtinIngredientGroups,
    });
    expect(resolveRef("onion", availability)).toEqual({ kind: "have", ingredientId: "onion" });
    expect(resolveRef("group:cooking-fat", availability)).toEqual({ kind: "have-via-group", ingredientId: "butter" });
    expect(resolveRef("group:stock", availability)).toEqual({ kind: "missing" });
    expect(resolveRef("milk", availability)).toEqual({ kind: "missing" });
  });

  it("orders group members deterministically", () => {
    const availability = buildAvailability({
      availableIngredientIds: new Set(["passata", "canned-tomatoes", "tomato-paste"]),
      stapleIds: new Set(["tomato-paste"]),
      ingredientGroups: builtinIngredientGroups,
    });
    expect(availability.groupMembers.get("tomato-base")).toEqual(["canned-tomatoes", "passata", "tomato-paste"]);
  });
});
