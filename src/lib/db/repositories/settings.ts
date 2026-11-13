import { z } from "zod";
import { db } from "@/lib/db/dexie";
import { mealTypeSchema } from "@/lib/schemas/recipe";

// Settings are stored as key/value rows. Each key has its own schema so a
// corrupted or imported value can never break the UI — invalid values fall
// back to the default.
const settingSchemas = {
  onboardingDone: z.boolean(),
  householdSize: z.number().int().min(1).max(20),
  excludedMealTypes: z.array(mealTypeSchema),
  aiAccessToken: z.string(),
  lastBackupAt: z.number(),
  backupReminderSnoozedAt: z.number(),
  installedAt: z.number(),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingsMap = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };

export const defaultSettings: SettingsMap = {
  onboardingDone: false,
  householdSize: 4,
  excludedMealTypes: [],
  aiAccessToken: "",
  lastBackupAt: 0,
  backupReminderSnoozedAt: 0,
  installedAt: 0,
};

function parseValue<K extends SettingKey>(key: K, value: unknown): SettingsMap[K] {
  const result = settingSchemas[key].safeParse(value);
  return (result.success ? result.data : defaultSettings[key]) as SettingsMap[K];
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const row = await db.settings.get(key);
  return row ? parseValue(key, row.value) : defaultSettings[key];
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingsMap[K]): Promise<void> {
  await db.settings.put({ key, value: settingSchemas[key].parse(value) });
}

export async function getAllSettings(): Promise<SettingsMap> {
  const rows = await db.settings.toArray();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const result = { ...defaultSettings };
  for (const key of Object.keys(settingSchemas) as SettingKey[]) {
    if (byKey.has(key)) {
      (result as Record<SettingKey, unknown>)[key] = parseValue(key, byKey.get(key));
    }
  }
  return result;
}
