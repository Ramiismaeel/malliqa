import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingredientCategories } from "@/data/categories";
import { equipment } from "@/data/equipment";
import { foodArt } from "@/data/food-art";
import {
  defaultStapleIds,
  groupById,
  groupMembers,
  ingredientById,
  ingredientGroups,
  ingredients,
} from "@/data/ingredients";
import { cuisineLabels, RAN_OUT_ICON } from "@/lib/labels";
import { equipmentSchema } from "@/lib/schemas/equipment";
import { ingredientGroupSchema, ingredientSchema } from "@/lib/schemas/ingredient";
import { ART_PREFIX, courseSchema, GROUP_PREFIX, recipeSchema } from "@/lib/schemas/recipe";
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

  it("every built-in recipe has a course, and each course has recipes", () => {
    for (const recipe of allRecipes) expect(recipe.course, recipe.id).toBeDefined();
    for (const course of courseSchema.options) {
      expect(allRecipes.filter((r) => r.course === course).length, course).toBeGreaterThanOrEqual(10);
    }
  });

  it("every drawing used as an icon exists, and every drawing is used", () => {
    const icons = [
      ...[...allRecipes, ...ingredients, ...ingredientCategories, ...Object.values(cuisineLabels)].map((item) => item.emoji ?? ""),
      RAN_OUT_ICON,
    ];
    const used = new Set(icons.filter((icon) => icon.startsWith(ART_PREFIX)).map((icon) => icon.slice(ART_PREFIX.length)));
    for (const name of used) expect(foodArt[name], name).toBeDefined();
    for (const name of Object.keys(foodArt)) expect(used.has(name), name).toBe(true);
  });

  // A phone draws only the emoji its system font knows. Android 12 stops at
  // Emoji 13.1, and Firefox there cannot fetch newer ones the way Chrome does,
  // so a newer emoji shows as an empty box. Anything newer than Emoji 12 gets
  // a drawing in `food-art.ts` instead.
  it("uses no emoji newer than Emoji 12 anywhere in the app", () => {
    const tooNew =
      /[\u{1F6D6}\u{1F6D7}\u{1F6DC}-\u{1F6DF}\u{1F6FB}\u{1F6FC}\u{1F7F0}\u{1F90C}\u{1F972}\u{1F977}-\u{1F979}\u{1F9A3}\u{1F9A4}\u{1F9AB}-\u{1F9AD}\u{1F9CB}\u{1F9CC}\u{1FA74}-\u{1FA77}\u{1FA7B}-\u{1FA7F}\u{1FA83}-\u{1FA8F}\u{1FA96}-\u{1FAFF}]/gu;
    const sourceFiles = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
      );
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const found = readFileSync(file, "utf8").match(tooNew) ?? [];
      expect(found, file).toEqual([]);
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
