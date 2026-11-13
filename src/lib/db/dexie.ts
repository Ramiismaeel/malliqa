import Dexie, { type EntityTable } from "dexie";
import type {
  AiRecipeRow,
  CustomIngredient,
  DayPlanRow,
  EquipmentRow,
  FavoriteRow,
  PantryRow,
  SettingRow,
} from "@/lib/schemas/backup";

/**
 * User data only. Static data (recipes, ingredient dictionary, equipment)
 * lives in `src/data/` and is never copied into IndexedDB.
 *
 * Every schema change = a new `this.version(n)` with an upgrade function.
 * Never edit an old version.
 */
export class MalliqaDB extends Dexie {
  pantry!: EntityTable<PantryRow, "ingredientId">;
  customIngredients!: EntityTable<CustomIngredient, "id">;
  equipment!: EntityTable<EquipmentRow, "equipmentId">;
  settings!: EntityTable<SettingRow, "key">;
  favorites!: EntityTable<FavoriteRow, "recipeId">;
  dayPlan!: EntityTable<DayPlanRow, "date">;
  aiRecipes!: EntityTable<AiRecipeRow, "id">;

  constructor(name = "malliqa") {
    super(name);
    this.version(1).stores({
      pantry: "ingredientId, available, isStaple",
      customIngredients: "id, category",
      equipment: "equipmentId",
      settings: "key",
      favorites: "recipeId, addedAt",
      dayPlan: "date",
      aiRecipes: "id, createdAt",
    });
  }
}

export const db = new MalliqaDB();
