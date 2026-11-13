import type { Capability, Equipment } from "@/lib/schemas/equipment";

// Recipes never ask for a device — they ask for a capability ("stovetop"),
// because a gas stove, an electric hob and an induction hob all do the job.
export const equipment: Equipment[] = [
  // Gas, electric and induction all do the same job, so they are one item.
  { id: "stove", name: "غاز / طباخ", emoji: "🔥", category: "cooking", provides: ["stovetop"] },
  { id: "pressure-cooker", name: "طنجرة ضغط", emoji: "🍲", category: "cooking", provides: ["pressure-cooker"] },
  { id: "oven", name: "فرن", emoji: "🥧", category: "baking", provides: ["oven"] },
  { id: "microwave", name: "مايكروويف", emoji: "📡", category: "electric", provides: ["microwave"] },
  { id: "air-fryer", name: "قلاية هوائية", emoji: "🌬️", category: "electric", provides: ["air-fryer"] },
  { id: "blender", name: "خلاط", emoji: "🥤", category: "electric", provides: ["blender"] },
  { id: "hand-mixer", name: "خفاقة يدوية كهربائية", emoji: "🥚", category: "electric", provides: ["hand-mixer"] },
  { id: "stand-mixer", name: "عجانة", emoji: "🎂", category: "electric", provides: ["stand-mixer", "hand-mixer"] },
  { id: "food-processor", name: "محضّرة طعام (فرّامة)", emoji: "🥗", category: "electric", provides: ["food-processor"] },
  { id: "electric-grill", name: "شواية كهربائية", emoji: "🥓", category: "electric", provides: ["grill"] },
  { id: "charcoal-grill", name: "منقل فحم", emoji: "🍢", category: "other", provides: ["grill"] },
];

export const equipmentById: ReadonlyMap<string, Equipment> = new Map(equipment.map((e) => [e.id, e]));

/** Equipment pre-checked in onboarding. */
export const defaultEquipmentIds: string[] = ["stove"];

/**
 * Ids used before the two stoves were merged. Saved data and old backups may
 * still contain them; they are rewritten to the current id (see dexie.ts v2).
 */
export const legacyEquipmentIds: Readonly<Record<string, string>> = {
  "gas-stove": "stove",
  "electric-hob": "stove",
};

export function canonicalEquipmentId(equipmentId: string): string {
  return legacyEquipmentIds[equipmentId] ?? equipmentId;
}

/** Capabilities offered by a set of available equipment ids. */
export function capabilitiesOf(equipmentIds: Iterable<string>): Set<Capability> {
  const caps = new Set<Capability>();
  for (const id of equipmentIds) {
    for (const cap of equipmentById.get(canonicalEquipmentId(id))?.provides ?? []) caps.add(cap);
  }
  return caps;
}
