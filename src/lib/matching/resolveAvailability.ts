import { CUSTOM_PREFIX, GROUP_PREFIX } from "@/lib/schemas/recipe";
import { normalizeArabic } from "@/lib/text/arabic";

export interface AvailabilityInput {
  /** Pantry items that are available (staples included) + custom ingredients. */
  availableIngredientIds: ReadonlySet<string>;
  stapleIds: ReadonlySet<string>;
  /** ingredient id → group ids it belongs to (built-in dictionary + custom). */
  ingredientGroups: ReadonlyMap<string, readonly string[]>;
}

export interface Availability {
  available: ReadonlySet<string>;
  staples: ReadonlySet<string>;
  /** group id → available member ids, non-staples first. */
  groupMembers: ReadonlyMap<string, readonly string[]>;
}

export type RefResolution =
  | { kind: "have"; ingredientId: string }
  | { kind: "have-via-group"; ingredientId: string }
  | { kind: "missing" };

/**
 * Expands availability with groups: an available ingredient satisfies every
 * `group:*` it belongs to. Within a group, non-staple members come first so a
 * recipe is credited with using the "fresh" item (tomato juice) rather than
 * the staple (tomato paste).
 */
export function buildAvailability(input: AvailabilityInput): Availability {
  const members = new Map<string, string[]>();
  for (const ingredientId of input.availableIngredientIds) {
    for (const groupId of input.ingredientGroups.get(ingredientId) ?? []) {
      const list = members.get(groupId);
      if (list) list.push(ingredientId);
      else members.set(groupId, [ingredientId]);
    }
  }
  for (const list of members.values()) {
    list.sort((a, b) => {
      const stapleDiff = Number(input.stapleIds.has(a)) - Number(input.stapleIds.has(b));
      return stapleDiff !== 0 ? stapleDiff : a.localeCompare(b);
    });
  }
  return {
    available: input.availableIngredientIds,
    staples: input.stapleIds,
    groupMembers: members,
  };
}

/** Key under which a free-text (AI) ingredient is looked up in the available set. */
export function customRefKey(name: string): string {
  return `${CUSTOM_PREFIX}${normalizeArabic(name)}`;
}

/** Resolves one recipe ref (`id`, `group:<id>` or `custom:<name>`) against the pantry. */
export function resolveRef(ref: string, availability: Availability): RefResolution {
  if (ref.startsWith(GROUP_PREFIX)) {
    const member = availability.groupMembers.get(ref.slice(GROUP_PREFIX.length))?.[0];
    return member ? { kind: "have-via-group", ingredientId: member } : { kind: "missing" };
  }
  if (ref.startsWith(CUSTOM_PREFIX)) {
    const key = customRefKey(ref.slice(CUSTOM_PREFIX.length));
    return availability.available.has(key) ? { kind: "have", ingredientId: key } : { kind: "missing" };
  }
  return availability.available.has(ref) ? { kind: "have", ingredientId: ref } : { kind: "missing" };
}
