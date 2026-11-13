import { describe, expect, it } from "vitest";
import { aiGeneratedSchema, aiSuggestRequestSchema, type AiGeneratedRecipe } from "@/lib/schemas/ai";
import { toRecipe, unknownIngredientNames } from "./map-recipe";
import { buildUserPrompt } from "./prompt";

const generated: AiGeneratedRecipe = {
  name: "أرز بالبندورة واللحم",
  description: "أرز أحمر سريع باللحم المفروم.",
  cuisine: "syrian",
  mealType: "meat",
  difficulty: "easy",
  prepMinutes: 10,
  cookMinutes: 25,
  servings: 4,
  ingredients: [
    { name: "لحمة مفرومة", amount: 300, unit: "g", role: "required" },
    { name: "الأرز", amount: 2, unit: "cup", role: "required" },
    { name: "طماطم", amount: 3, unit: "piece", role: "required" },
    { name: "بندورة", role: "optional" },
    { name: "دبس الخرنوب", amount: 1, unit: "tbsp", role: "optional", note: "للتحلية" },
  ],
  equipment: ["stovetop", "stovetop"],
  steps: ["قلّب اللحم.", "أضف الأرز والبندورة والماء.", "اطبخه 20 دقيقة."],
};

describe("toRecipe", () => {
  const recipe = toRecipe(generated, "ai-test");

  it("maps names and aliases to dictionary ids", () => {
    const refs = recipe.ingredients.map((i) => i.ref);
    expect(refs).toContain("minced-meat");
    expect(refs).toContain("rice");
    expect(refs).toContain("tomato");
  });

  it("merges duplicates that resolve to the same ingredient", () => {
    expect(recipe.ingredients.filter((i) => i.ref === "tomato")).toHaveLength(1);
  });

  it("keeps unknown names as flagged custom refs", () => {
    expect(recipe.ingredients.at(-1)).toMatchObject({ ref: "custom:دبس الخرنوب", note: "للتحلية" });
    expect(unknownIngredientNames(recipe)).toEqual(["دبس الخرنوب"]);
  });

  it("produces a valid AI recipe with de-duplicated equipment", () => {
    expect(recipe.source).toBe("ai");
    expect(recipe.id).toBe("ai-test");
    expect(recipe.equipment).toEqual([{ cap: "stovetop", role: "required" }]);
  });
});

describe("AI schemas", () => {
  it("rejects malformed model output", () => {
    expect(aiGeneratedSchema.safeParse({ recipes: [] }).success).toBe(false);
    expect(aiGeneratedSchema.safeParse({ recipes: [{ ...generated, cuisine: "martian" }] }).success).toBe(false);
    expect(aiGeneratedSchema.safeParse({ recipes: [{ ...generated, steps: [] }] }).success).toBe(false);
    expect(aiGeneratedSchema.safeParse({ recipes: [generated] }).success).toBe(true);
  });

  it("limits the request size", () => {
    const base = { ingredients: ["أرز"], equipment: ["stovetop"], exclude: [], count: 3 };
    expect(aiSuggestRequestSchema.safeParse(base).success).toBe(true);
    expect(aiSuggestRequestSchema.safeParse({ ...base, count: 9 }).success).toBe(false);
    expect(aiSuggestRequestSchema.safeParse({ ...base, ingredients: [] }).success).toBe(false);
    expect(
      aiSuggestRequestSchema.safeParse({ ...base, ingredients: Array.from({ length: 61 }, (_, i) => `م${i}`) }).success,
    ).toBe(false);
    expect(
      aiSuggestRequestSchema.safeParse({ ...base, exclude: Array.from({ length: 51 }, (_, i) => `و${i}`) }).success,
    ).toBe(false);
  });
});

describe("buildUserPrompt", () => {
  it("includes ingredients, equipment, filters and exclusions", () => {
    const prompt = buildUserPrompt({
      ingredients: ["أرز", "لحم مفروم"],
      equipment: ["stovetop"],
      timeBucket: "quick",
      cuisine: "syrian",
      mealType: "meat",
      exclude: ["مجدرة"],
      count: 4,
    });
    expect(prompt).toContain("اقترح 4 وصفات");
    expect(prompt).toContain("أرز، لحم مفروم");
    expect(prompt).toContain("stovetop");
    expect(prompt).toContain("حتى 30 دقيقة");
    expect(prompt).toContain("مجدرة");
  });

  it("handles a kitchen with no equipment", () => {
    const prompt = buildUserPrompt({ ingredients: ["خيار"], equipment: [], exclude: [], count: 3 });
    expect(prompt).toContain("بلا طبخ");
  });
});
