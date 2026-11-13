import { z } from "zod";
import { ingredientCategorySchema } from "./ingredient";
import { recipeSchema } from "./recipe";

// Row shapes of the Dexie tables. These schemas are the single source of the
// user-data types and are reused to validate backup files before import.

export const pantryRowSchema = z.object({
  ingredientId: z.string().min(1),
  available: z.boolean(),
  isStaple: z.boolean(),
  updatedAt: z.number(),
});

export const customIngredientSchema = z.object({
  id: z.string().startsWith("custom-"),
  name: z.string().trim().min(1).max(60),
  category: ingredientCategorySchema,
  groups: z.array(z.string().min(1)).optional(),
});

export const equipmentRowSchema = z.object({
  equipmentId: z.string().min(1),
  available: z.boolean(),
});

export const settingRowSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const favoriteRowSchema = z.object({
  recipeId: z.string().min(1),
  addedAt: z.number(),
});

export const dayPlanRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recipeId: z.string().min(1),
  source: z.enum(["builtin", "ai"]),
});

export const aiRecipeRowSchema = recipeSchema.extend({
  source: z.literal("ai"),
  createdAt: z.number(),
  prompt: z.string().optional(),
});

export const BACKUP_APP_ID = "kitchen-assistant";
export const BACKUP_VERSION = 1;

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  backupVersion: z.literal(BACKUP_VERSION),
  exportedAt: z.iso.datetime(),
  data: z.object({
    pantry: z.array(pantryRowSchema),
    customIngredients: z.array(customIngredientSchema),
    equipment: z.array(equipmentRowSchema),
    settings: z.array(settingRowSchema),
    favorites: z.array(favoriteRowSchema),
    dayPlan: z.array(dayPlanRowSchema),
    aiRecipes: z.array(aiRecipeRowSchema),
  }),
});

export type PantryRow = z.infer<typeof pantryRowSchema>;
export type CustomIngredient = z.infer<typeof customIngredientSchema>;
export type EquipmentRow = z.infer<typeof equipmentRowSchema>;
export type SettingRow = z.infer<typeof settingRowSchema>;
export type FavoriteRow = z.infer<typeof favoriteRowSchema>;
export type DayPlanRow = z.infer<typeof dayPlanRowSchema>;
export type AiRecipeRow = z.infer<typeof aiRecipeRowSchema>;
export type Backup = z.infer<typeof backupSchema>;
