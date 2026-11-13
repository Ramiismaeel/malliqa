import { ingredientCategoryById } from "@/data/categories";
import { groupById, groupMembers, ingredientById, ingredients } from "@/data/ingredients";
import type { CustomIngredient } from "@/lib/schemas/backup";
import type { Ingredient } from "@/lib/schemas/ingredient";
import { CUSTOM_PREFIX, GROUP_PREFIX } from "@/lib/schemas/recipe";
import { normalizeArabic } from "@/lib/text/arabic";

export interface RefInfo {
  name: string;
  emoji: string;
  /** For groups: names of a few members, e.g. "عصير طماطم، رب البندورة…" */
  hint?: string;
}

/**
 * Turns any recipe ref (ingredient id, `group:<id>`, custom pantry id or
 * free-text `custom:<name>`) into something displayable.
 */
export function createRefResolver(customIngredients: readonly CustomIngredient[] = []) {
  const customById = new Map(customIngredients.map((c) => [c.id, c]));

  return function resolve(ref: string): RefInfo {
    if (ref.startsWith(GROUP_PREFIX)) {
      const groupId = ref.slice(GROUP_PREFIX.length);
      const members = (groupMembers.get(groupId) ?? [])
        .slice(0, 4)
        .map((id) => ingredientById.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      return {
        name: groupById.get(groupId)?.name ?? groupId,
        emoji: ingredientById.get(groupMembers.get(groupId)?.[0] ?? "")?.emoji ?? "🧺",
        hint: members.join("، "),
      };
    }
    if (ref.startsWith(CUSTOM_PREFIX)) {
      return { name: ref.slice(CUSTOM_PREFIX.length), emoji: "✨" };
    }
    const builtin = ingredientById.get(ref);
    if (builtin) {
      return { name: builtin.name, emoji: builtin.emoji ?? ingredientCategoryById[builtin.category].emoji };
    }
    const custom = customById.get(ref);
    if (custom) return { name: custom.name, emoji: ingredientCategoryById[custom.category].emoji };
    return { name: ref, emoji: "🧺" };
  };
}

export type RefResolver = ReturnType<typeof createRefResolver>;

// ── free-text name → dictionary id (used for AI output and pantry search) ──

const nameIndex: ReadonlyMap<string, string> = (() => {
  const index = new Map<string, string>();
  const add = (text: string, id: string) => {
    const key = normalizeArabic(text);
    if (key && !index.has(key)) index.set(key, id);
  };
  // Names win over aliases when two ingredients share a spelling.
  for (const ingredient of ingredients) add(ingredient.name, ingredient.id);
  for (const ingredient of ingredients) {
    if (ingredient.nameEn) add(ingredient.nameEn, ingredient.id);
    for (const alias of ingredient.aliases) add(alias, ingredient.id);
  }
  return index;
})();

/** Exact (normalized) match of a free-text name against names and aliases. */
export function findIngredientIdByName(name: string): string | undefined {
  return nameIndex.get(normalizeArabic(name));
}

/** Text an ingredient is searched by: name, English name and aliases. */
export function ingredientSearchText(ingredient: Pick<Ingredient, "name" | "nameEn" | "aliases">): string {
  return [ingredient.name, ingredient.nameEn ?? "", ...ingredient.aliases].join(" ");
}
