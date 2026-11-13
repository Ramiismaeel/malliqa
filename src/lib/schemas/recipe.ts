import { z } from "zod";
import { capabilitySchema } from "./equipment";

export const cuisineSchema = z.enum([
  "syrian",
  "levantine",
  "arab",
  "italian",
  "asian",
  "quick",
  "bakery",
  "other",
]);

export const mealTypeSchema = z.enum(["meat", "chicken", "fish", "vegetarian", "vegan"]);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

/** Where a dish sits in a meal: أساسية / مقبلات / حلويات. */
export const courseSchema = z.enum(["main", "appetizer", "dessert"]);

export const unitSchema = z.enum([
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "piece",
  "pinch",
  "to-taste",
]);

export const ingredientRoleSchema = z.enum(["required", "optional"]);

export const recipeIngredientSchema = z.object({
  /** Ingredient id, `group:<groupId>`, or (AI recipes only) `custom:<name>`. */
  ref: z.string().min(1),
  amount: z.number().positive().optional(),
  unit: unitSchema.optional(),
  role: ingredientRoleSchema,
  note: z.string().min(1).optional(),
});

export const advancePrepSchema = z.object({
  kind: z.enum(["soak", "marinate", "rise", "chill"]),
  hours: z.number().positive(),
  note: z.string().min(1).optional(),
});

export const substituteSchema = z.object({
  for: z.string().min(1),
  use: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).optional(),
});

export const recipeEquipmentSchema = z.object({
  cap: capabilitySchema,
  role: ingredientRoleSchema,
});

export const recipeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  /** Shown instead of a photo: a single emoji, or `art:<name>` for a drawing from `src/data/food-art.ts`. */
  emoji: z.string().min(1).max(40).optional(),
  description: z.string().min(1),
  cuisine: cuisineSchema,
  mealType: mealTypeSchema,
  /** Every built-in recipe has one; AI recipes may omit it (treated as a main dish). */
  course: courseSchema.optional(),
  difficulty: difficultySchema,
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  advancePrep: advancePrepSchema.optional(),
  servings: z.number().int().positive(),
  ingredients: z.array(recipeIngredientSchema).min(1),
  substitutes: z.array(substituteSchema).optional(),
  equipment: z.array(recipeEquipmentSchema),
  steps: z.array(z.string().trim().min(1)).min(1),
  tags: z.array(z.string().min(1)).optional(),
  source: z.enum(["builtin", "ai"]),
});

export type Cuisine = z.infer<typeof cuisineSchema>;
export type MealType = z.infer<typeof mealTypeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Course = z.infer<typeof courseSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type AdvancePrep = z.infer<typeof advancePrepSchema>;
export type Substitute = z.infer<typeof substituteSchema>;
export type Recipe = z.infer<typeof recipeSchema>;

export const GROUP_PREFIX = "group:";
/** Prefix of an `emoji` value that names a drawing instead of an emoji. */
export const ART_PREFIX = "art:";

/** A recipe without a course is a main dish. */
export const courseOf = (recipe: Pick<Recipe, "course">): Course => recipe.course ?? "main";
export const CUSTOM_PREFIX = "custom:";
