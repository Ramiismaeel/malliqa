import { db } from "@/lib/db/dexie";
import {
  BACKUP_APP_ID,
  BACKUP_VERSION,
  backupSchema,
  type Backup,
} from "@/lib/schemas/backup";

export async function exportBackup(): Promise<Backup> {
  const [pantry, customIngredients, equipment, settings, favorites, dayPlan, aiRecipes] =
    await Promise.all([
      db.pantry.toArray(),
      db.customIngredients.toArray(),
      db.equipment.toArray(),
      db.settings.toArray(),
      db.favorites.toArray(),
      db.dayPlan.toArray(),
      db.aiRecipes.toArray(),
    ]);

  return {
    app: BACKUP_APP_ID,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      pantry,
      customIngredients,
      equipment,
      // The access token is a secret of this device; it is never exported.
      settings: settings.filter((row) => row.key !== "aiAccessToken"),
      favorites,
      dayPlan,
      aiRecipes,
    },
  };
}

export type ParseBackupResult =
  | { ok: true; backup: Backup }
  | { ok: false; reason: "not-json" | "invalid" };

/** Validates the text of a backup file. Nothing is written. */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not-json" };
  }
  const result = backupSchema.safeParse(raw);
  return result.success ? { ok: true, backup: result.data } : { ok: false, reason: "invalid" };
}

export interface BackupSummary {
  exportedAt: string;
  pantryAvailable: number;
  staples: number;
  customIngredients: number;
  equipment: number;
  favorites: number;
  aiRecipes: number;
}

export function summarizeBackup(backup: Backup): BackupSummary {
  const { data } = backup;
  return {
    exportedAt: backup.exportedAt,
    pantryAvailable: data.pantry.filter((r) => r.available).length,
    staples: data.pantry.filter((r) => r.isStaple).length,
    customIngredients: data.customIngredients.length,
    equipment: data.equipment.filter((r) => r.available).length,
    favorites: data.favorites.length,
    aiRecipes: data.aiRecipes.length,
  };
}

/** Replaces ALL user data with the backup. Call only after explicit confirmation. */
export async function importBackup(backup: Backup): Promise<void> {
  const { data } = backupSchema.parse(backup);
  await db.transaction(
    "rw",
    [db.pantry, db.customIngredients, db.equipment, db.settings, db.favorites, db.dayPlan, db.aiRecipes],
    async () => {
      // Keep the device-local access token across imports.
      const token = await db.settings.get("aiAccessToken");
      await Promise.all([
        db.pantry.clear(),
        db.customIngredients.clear(),
        db.equipment.clear(),
        db.settings.clear(),
        db.favorites.clear(),
        db.dayPlan.clear(),
        db.aiRecipes.clear(),
      ]);
      await Promise.all([
        db.pantry.bulkPut(data.pantry),
        db.customIngredients.bulkPut(data.customIngredients),
        db.equipment.bulkPut(data.equipment),
        db.settings.bulkPut(data.settings.filter((row) => row.key !== "aiAccessToken")),
        db.favorites.bulkPut(data.favorites),
        db.dayPlan.bulkPut(data.dayPlan),
        db.aiRecipes.bulkPut(data.aiRecipes),
      ]);
      if (token) await db.settings.put(token);
    },
  );
}

/** Wipes every table (used by "reset app" in settings). */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.pantry, db.customIngredients, db.equipment, db.settings, db.favorites, db.dayPlan, db.aiRecipes],
    async () => {
      await Promise.all([
        db.pantry.clear(),
        db.customIngredients.clear(),
        db.equipment.clear(),
        db.settings.clear(),
        db.favorites.clear(),
        db.dayPlan.clear(),
        db.aiRecipes.clear(),
      ]);
    },
  );
}
