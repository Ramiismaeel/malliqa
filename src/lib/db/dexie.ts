import Dexie, { type EntityTable } from "dexie";
import { legacyEquipmentIds } from "@/data/equipment";
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

    // v2: gas stove and electric hob were merged into one "stove" item.
    // Same stores; only the saved equipment ids are rewritten.
    this.version(2).upgrade(async (tx) => {
      const table = tx.table<EquipmentRow, string>("equipment");
      const rows = await table.toArray();
      for (const row of rows) {
        const current = legacyEquipmentIds[row.equipmentId];
        if (!current) continue;
        await table.delete(row.equipmentId);
        if (row.available) await table.put({ equipmentId: current, available: true });
      }
    });
  }
}

export const db = new MalliqaDB();
