import { z } from "zod";
import { capabilitySchema } from "./equipment";
import {
  cuisineSchema,
  difficultySchema,
  ingredientRoleSchema,
  mealTypeSchema,
  recipeSchema,
  unitSchema,
} from "./recipe";

export const AI_MAX_INGREDIENTS = 60;
export const AI_MAX_EXCLUDE = 50;
export const AI_MIN_COUNT = 3;
export const AI_MAX_COUNT = 5;

/** Body of `POST /api/ai/suggest`. Names only — never pantry rows or ids. */
export const aiSuggestRequestSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(60)).min(1).max(AI_MAX_INGREDIENTS),
  equipment: z.array(capabilitySchema).max(capabilitySchema.options.length),
  timeBucket: z.enum(["quick", "medium", "long"]).optional(),
  cuisine: cuisineSchema.optional(),
  mealType: mealTypeSchema.optional(),
  exclude: z.array(z.string().trim().min(1).max(80)).max(AI_MAX_EXCLUDE),
  count: z.number().int().min(AI_MIN_COUNT).max(AI_MAX_COUNT),
});

/** One recipe as the model writes it: ingredient names are free Arabic text. */
export const aiGeneratedRecipeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).optional(),
  emoji: z.string().trim().max(8).optional(),
  description: z.string().trim().min(1).max(240),
  cuisine: cuisineSchema,
  mealType: mealTypeSchema,
  difficulty: difficultySchema,
  prepMinutes: z.number().int().min(0).max(600),
  cookMinutes: z.number().int().min(0).max(900),
  servings: z.number().int().min(1).max(20),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        amount: z.number().positive().max(10000).optional(),
        unit: unitSchema.optional(),
        role: ingredientRoleSchema,
        note: z.string().trim().max(80).optional(),
      }),
    )
    .min(2)
    .max(30),
  equipment: z.array(capabilitySchema).max(6),
  steps: z.array(z.string().trim().min(3).max(400)).min(2).max(12),
  tags: z.array(z.string().trim().min(1).max(24)).max(6).optional(),
});

export const aiGeneratedSchema = z.object({
  recipes: z.array(aiGeneratedRecipeSchema).min(1).max(AI_MAX_COUNT),
});

/** Response of the route, validated again on the client before rendering. */
export const aiSuggestResponseSchema = z.object({
  recipes: z.array(recipeSchema.extend({ source: z.literal("ai") })).min(1),
});

export const aiErrorResponseSchema = z.object({
  error: z.string(),
});

export type AiSuggestRequest = z.infer<typeof aiSuggestRequestSchema>;
export type AiGeneratedRecipe = z.infer<typeof aiGeneratedRecipeSchema>;
export type AiSuggestResponse = z.infer<typeof aiSuggestResponseSchema>;

/**
 * JSON Schema handed to Gemini as `responseJsonSchema`. Written by hand (and
 * kept in sync with `aiGeneratedSchema`) to stay inside the subset of JSON
 * Schema that structured output supports.
 */
export const aiResponseJsonSchema = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "اسم الوصفة بالعربية" },
          nameEn: { type: "string", description: "English name" },
          emoji: { type: "string", description: "A single food emoji that fits the dish" },
          description: { type: "string", description: "سطر واحد يصف الطبق بالعربية" },
          cuisine: { type: "string", enum: cuisineSchema.options },
          mealType: { type: "string", enum: mealTypeSchema.options },
          difficulty: { type: "string", enum: difficultySchema.options },
          prepMinutes: { type: "integer" },
          cookMinutes: { type: "integer" },
          servings: { type: "integer" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "اسم المكوّن بالعربية، بنفس صيغة القائمة إن كان منها" },
                amount: { type: "number" },
                unit: { type: "string", enum: unitSchema.options },
                role: { type: "string", enum: ingredientRoleSchema.options },
                note: { type: "string" },
              },
              required: ["name", "role"],
            },
          },
          equipment: {
            type: "array",
            description: "Required equipment capabilities only",
            items: { type: "string", enum: capabilitySchema.options },
          },
          steps: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
        },
        required: [
          "name",
          "description",
          "cuisine",
          "mealType",
          "difficulty",
          "prepMinutes",
          "cookMinutes",
          "servings",
          "ingredients",
          "equipment",
          "steps",
        ],
      },
    },
  },
  required: ["recipes"],
} as const;
