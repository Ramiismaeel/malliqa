import { describe, expect, it } from "vitest";
import { equipment } from "@/data/equipment";
import {
  defaultStapleIds,
  groupById,
  groupMembers,
  ingredientById,
  ingredientGroups,
  ingredients,
} from "@/data/ingredients";
import { equipmentSchema } from "@/lib/schemas/equipment";
import { ingredientGroupSchema, ingredientSchema } from "@/lib/schemas/ingredient";
import { GROUP_PREFIX, recipeSchema } from "@/lib/schemas/recipe";
import { timeBucketOf } from "@/lib/matching/timeBucket";
import { normalizeArabic } from "@/lib/text/arabic";
import { allRecipes } from "./index";

function refExists(ref: string): boolean {
  if (ref.startsWith(GROUP_PREFIX)) return groupById.has(ref.slice(GROUP_PREFIX.length));
  return ingredientById.has(ref);
}

describe("ingredient dictionary", () => {
  it("every ingredient and group parses with Zod", () => {
    for (const ingredient of ingredients) {
      expect(() => ingredientSchema.parse(ingredient), ingredient.id).not.toThrow();
    }
    for (const group of ingredientGroups) {
      expect(() => ingredientGroupSchema.parse(group), group.id).not.toThrow();
    }
  });

  it("has unique ids", () => {
    const ids = ingredients.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groupIds = ingredientGroups.map((g) => g.id);
    expect(new Set(groupIds).size).toBe(groupIds.length);
  });

  it("has no two ingredients with the same normalized name", () => {
    const seen = new Map<string, string>();
    for (const ingredient of ingredients) {
      const key = normalizeArabic(ingredient.name);
      expect(seen.get(key), `${ingredient.id} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, ingredient.id);
    }
  });

  it("only references known groups, and every group has members", () => {
    for (const ingredient of ingredients) {
      for (const groupId of ingredient.groups ?? []) {
        expect(groupById.has(groupId), `${ingredient.id} → ${groupId}`).toBe(true);
      }
    }
    for (const group of ingredientGroups) {
      expect(groupMembers.get(group.id)?.length ?? 0, group.id).toBeGreaterThan(0);
    }
  });

  it("contains the required groups", () => {
    const required = [
      "tomato-base",
      "cheese-melting",
      "cheese-white",
      "stock",
      "cooking-fat",
      "yogurt-any",
      "bread-any",
      "rice-any",
      "pasta-any",
      "chili",
      "fresh-herbs",
    ];
    for (const id of required) expect(groupById.has(id), id).toBe(true);
    expect(groupMembers.get("tomato-base")).toEqual(
      expect.arrayContaining(["tomato", "tomato-juice", "tomato-paste", "passata", "canned-tomatoes"]),
    );
  });

  it("has the expected size and default staples (incl. rice, bulgur, flour)", () => {
    expect(ingredients.length).toBeGreaterThanOrEqual(200);
    expect(defaultStapleIds.length).toBeGreaterThanOrEqual(22);
    expect(defaultStapleIds).toEqual(expect.arrayContaining(["rice", "bulgur", "flour", "salt", "onion"]));
    expect(ingredients.filter((i) => i.common).length).toBeGreaterThanOrEqual(70);
  });
});

describe("equipment", () => {
  it("parses with Zod and has unique ids", () => {
    for (const item of equipment) expect(() => equipmentSchema.parse(item), item.id).not.toThrow();
    expect(new Set(equipment.map((e) => e.id)).size).toBe(equipment.length);
  });
});

describe("recipes", () => {
  it("every recipe parses with Zod", () => {
    for (const recipe of allRecipes) {
      const result = recipeSchema.safeParse(recipe);
      expect(result.success, `${recipe.id}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });

  it("has unique ids and unique names", () => {
    const ids = allRecipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = allRecipes.map((r) => normalizeArabic(r.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it("every ingredient ref exists (ingredient id or known group)", () => {
    for (const recipe of allRecipes) {
      for (const ingredient of recipe.ingredients) {
        expect(refExists(ingredient.ref), `${recipe.id} → ${ingredient.ref}`).toBe(true);
      }
    }
  });

  it("never lists the same ref twice in one recipe", () => {
    for (const recipe of allRecipes) {
      const refs = recipe.ingredients.map((i) => i.ref);
      expect(new Set(refs).size, recipe.id).toBe(refs.length);
    }
  });

  it("every substitute points at a recipe ingredient and uses known refs", () => {
    for (const recipe of allRecipes) {
      const refs = new Set(recipe.ingredients.map((i) => i.ref));
      for (const substitute of recipe.substitutes ?? []) {
        expect(refs.has(substitute.for), `${recipe.id}: substitute for ${substitute.for}`).toBe(true);
        for (const use of substitute.use) {
          expect(refExists(use), `${recipe.id}: substitute use ${use}`).toBe(true);
        }
      }
    }
  });

  it("has at least one required ingredient and no empty steps", () => {
    for (const recipe of allRecipes) {
      expect(recipe.ingredients.some((i) => i.role === "required"), recipe.id).toBe(true);
      expect(recipe.steps.length, recipe.id).toBeGreaterThanOrEqual(2);
      for (const step of recipe.steps) expect(step.trim().length, recipe.id).toBeGreaterThan(5);
    }
  });

  it("built-in recipes are marked as builtin", () => {
    for (const recipe of allRecipes) expect(recipe.source, recipe.id).toBe("builtin");
  });

  it("contains the recipes the golden test depends on", () => {
    const ids = new Set(allRecipes.map((r) => r.id));
    for (const id of [
      "spaghetti-bolognese",
      "rice-with-vermicelli",
      "baked-pasta-with-meat",
      "stovetop-bechamel-pasta",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("meets the count and balance targets", () => {
    const total = allRecipes.length;
    expect(total).toBeGreaterThanOrEqual(80);

    const arabic = allRecipes.filter((r) => ["syrian", "levantine", "arab"].includes(r.cuisine)).length;
    expect(arabic / total).toBeGreaterThanOrEqual(0.5);

    const quick = allRecipes.filter((r) => timeBucketOf(r) === "quick").length;
    expect(quick).toBeGreaterThanOrEqual(25);

    const vegetarian = allRecipes.filter((r) => r.mealType === "vegetarian" || r.mealType === "vegan").length;
    expect(vegetarian).toBeGreaterThanOrEqual(20);

    // "no oven, no stove" recipes: salads, sandwiches, dips.
    const noCook = allRecipes.filter(
      (r) => !r.equipment.some((e) => e.role === "required" && (e.cap === "oven" || e.cap === "stovetop")),
    ).length;
    expect(noCook).toBeGreaterThanOrEqual(10);
  });
});
