import type { EquipmentCategory } from "@/lib/schemas/equipment";
import type { IngredientCategory } from "@/lib/schemas/ingredient";

export interface CategoryInfo<T extends string> {
  id: T;
  name: string;
  shortName: string;
  emoji: string;
}

/** Display order of ingredient categories in the pantry and onboarding. */
export const ingredientCategories: CategoryInfo<IngredientCategory>[] = [
  { id: "meat", name: "اللحوم والبروتينات", shortName: "لحوم", emoji: "🥩" },
  { id: "vegetables", name: "الخضار", shortName: "خضار", emoji: "🥬" },
  { id: "fruits", name: "الفواكه", shortName: "فواكه", emoji: "🍎" },
  { id: "grains", name: "الحبوب والنشويات", shortName: "حبوب", emoji: "🌾" },
  { id: "legumes", name: "البقوليات", shortName: "بقوليات", emoji: "🫘" },
  { id: "dairy-eggs", name: "الألبان والبيض", shortName: "ألبان وبيض", emoji: "🥛" },
  { id: "spices", name: "التوابل والأعشاب", shortName: "توابل", emoji: "🧂" },
  { id: "sauces", name: "الصلصات والمعلبات", shortName: "صلصات", emoji: "🥫" },
  { id: "oils", name: "الزيوت والدهون", shortName: "زيوت", emoji: "🫒" },
  { id: "other", name: "إضافات", shortName: "إضافات", emoji: "🍯" },
];

export const ingredientCategoryById: Record<IngredientCategory, CategoryInfo<IngredientCategory>> =
  Object.fromEntries(ingredientCategories.map((c) => [c.id, c])) as Record<
    IngredientCategory,
    CategoryInfo<IngredientCategory>
  >;

export const equipmentCategories: CategoryInfo<EquipmentCategory>[] = [
  { id: "cooking", name: "الطبخ", shortName: "طبخ", emoji: "🔥" },
  { id: "baking", name: "الخبز", shortName: "خبز", emoji: "🥧" },
  { id: "electric", name: "الأجهزة الكهربائية الصغيرة", shortName: "كهربائية", emoji: "🔌" },
  { id: "other", name: "أخرى", shortName: "أخرى", emoji: "🧰" },
];
