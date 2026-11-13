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
  /** Single emoji shown instead of a photo (no images in v1). */
  emoji: z.string().min(1).max(8).optional(),
  description: z.string().min(1),
  cuisine: cuisineSchema,
  mealType: mealTypeSchema,
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
export type Unit = z.infer<typeof unitSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type AdvancePrep = z.infer<typeof advancePrepSchema>;
export type Substitute = z.infer<typeof substituteSchema>;
export type Recipe = z.infer<typeof recipeSchema>;

export const GROUP_PREFIX = "group:";
export const CUSTOM_PREFIX = "custom:";
