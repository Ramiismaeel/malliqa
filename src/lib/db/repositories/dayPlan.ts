import { db } from "@/lib/db/dexie";
import type { DayPlanRow } from "@/lib/schemas/backup";

/** Local date as `YYYY-MM-DD`. `offsetDays = 1` gives tomorrow. */
export function dateKey(offsetDays = 0, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getPlan(date: string): Promise<DayPlanRow | undefined> {
  return db.dayPlan.get(date);
}

export function listPlans(): Promise<DayPlanRow[]> {
  return db.dayPlan.toArray();
}

/** One pinned recipe per day; pinning again replaces the previous choice. */
export async function setPlan(
  date: string,
  recipeId: string,
  source: DayPlanRow["source"],
): Promise<void> {
  await db.dayPlan.put({ date, recipeId, source });
}

export async function clearPlan(date: string): Promise<void> {
  await db.dayPlan.delete(date);
}

/** Drops plans older than yesterday so the table stays tiny. */
export async function pruneOldPlans(): Promise<void> {
  const cutoff = dateKey(-1);
  await db.dayPlan.where("date").below(cutoff).delete();
}
