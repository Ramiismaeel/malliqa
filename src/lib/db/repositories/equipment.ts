import { db } from "@/lib/db/dexie";
import type { EquipmentRow } from "@/lib/schemas/backup";

export function listEquipment(): Promise<EquipmentRow[]> {
  return db.equipment.toArray();
}

export async function setEquipmentAvailable(equipmentId: string, available: boolean): Promise<void> {
  if (available) {
    await db.equipment.put({ equipmentId, available: true });
  } else {
    await db.equipment.delete(equipmentId);
  }
}

export async function toggleEquipment(equipmentId: string): Promise<boolean> {
  const row = await db.equipment.get(equipmentId);
  const next = !(row?.available ?? false);
  await setEquipmentAvailable(equipmentId, next);
  return next;
}

/** Used by onboarding: replaces the whole selection. */
export async function replaceEquipment(equipmentIds: string[]): Promise<void> {
  await db.transaction("rw", db.equipment, async () => {
    await db.equipment.clear();
    await db.equipment.bulkPut(equipmentIds.map((equipmentId) => ({ equipmentId, available: true })));
  });
}
