import { z } from "zod";

export const ingredientCategorySchema = z.enum([
  "meat",
  "vegetables",
  "fruits",
  "grains",
  "legumes",
  "dairy-eggs",
  "spices",
  "sauces",
  "oils",
  "other",
]);

export const ingredientSchema = z.object({
  /** kebab-case English, stable forever. */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  nameEn: z.string().min(1).optional(),
  emoji: z.string().min(1).max(8).optional(),
  aliases: z.array(z.string().min(1)),
  category: ingredientCategorySchema,
  groups: z.array(z.string().min(1)).optional(),
  defaultStaple: z.boolean().optional(),
  common: z.boolean().optional(),
});

export const ingredientGroupSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
});

export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type IngredientGroup = z.infer<typeof ingredientGroupSchema>;
