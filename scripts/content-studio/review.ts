// Shape of content/recipe-review.json — the hand-off file between the content
// studio (written by the owner) and whoever applies the notes to src/data.
import { z } from "zod";

/** Where a dish sits in a meal. Not part of the app's Recipe schema yet. */
export const courseSchema = z.enum(["main", "appetizer", "dessert"]);
export type Course = z.infer<typeof courseSchema>;

export const courses: Array<{ id: Course; label: string; emoji: string }> = [
  { id: "main", label: "أساسية", emoji: "🍲" },
  { id: "appetizer", label: "مقبلات", emoji: "🥗" },
  { id: "dessert", label: "حلويات", emoji: "🍮" },
];

/** Notes on one existing recipe, keyed by recipe id. */
export const recipeNoteSchema = z.object({
  course: courseSchema.optional(),
  /** The owner read the recipe and found it correct. */
  ok: z.boolean().optional(),
  /** What is wrong or missing, in free text. */
  comment: z.string().max(8000).optional(),
  /** Replacement emoji suggested by the owner. */
  emoji: z.string().max(16).optional(),
  updatedAt: z.string().optional(),
});
export type RecipeNote = z.infer<typeof recipeNoteSchema>;

/** A recipe the owner wants added. Free text on purpose: it is rewritten into a proper Recipe later. */
export const newRecipeSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(200),
  emoji: z.string().max(16),
  course: courseSchema.optional(),
  cuisine: z.string().max(40),
  mealType: z.string().max(40),
  time: z.string().max(200),
  servings: z.string().max(100),
  description: z.string().max(1000),
  /** One ingredient per line. */
  ingredients: z.string().max(8000),
  /** One step per line. */
  steps: z.string().max(16000),
  notes: z.string().max(8000),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type NewRecipe = z.infer<typeof newRecipeSchema>;

export const reviewSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().optional(),
  /** Notes that are not about one recipe. */
  generalNotes: z.string().max(20000),
  recipes: z.record(z.string(), recipeNoteSchema),
  newRecipes: z.array(newRecipeSchema),
});
export type Review = z.infer<typeof reviewSchema>;

export const emptyReview = (): Review => ({ version: 1, generalNotes: "", recipes: {}, newRecipes: [] });

function isEmptyNote(note: RecipeNote): boolean {
  return !note.course && !note.ok && !note.comment?.trim() && !note.emoji?.trim();
}

/**
 * Drops empty notes and orders the rest like the recipe list, so the file
 * stays small and its diffs stay readable. Notes for unknown ids are kept at
 * the end (a recipe may have been renamed).
 */
export function normalizeReview(review: Review, recipeOrder: readonly string[]): Review {
  const known = recipeOrder.filter((id) => review.recipes[id]);
  const unknown = Object.keys(review.recipes).filter((id) => !recipeOrder.includes(id));
  const recipes: Review["recipes"] = {};
  for (const id of [...known, ...unknown]) {
    const note = review.recipes[id];
    if (!note || isEmptyNote(note)) continue;
    recipes[id] = {
      ...(note.course ? { course: note.course } : {}),
      ...(note.ok ? { ok: true } : {}),
      ...(note.emoji?.trim() ? { emoji: note.emoji.trim() } : {}),
      ...(note.comment?.trim() ? { comment: note.comment.trim() } : {}),
      ...(note.updatedAt ? { updatedAt: note.updatedAt } : {}),
    };
  }
  return {
    version: 1,
    updatedAt: review.updatedAt,
    generalNotes: review.generalNotes.trim(),
    recipes,
    newRecipes: review.newRecipes,
  };
}
