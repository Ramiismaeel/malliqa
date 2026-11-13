import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { db, MalliqaDB } from "@/lib/db/dexie";
import { deleteAiRecipe, listAiRecipes, saveAiRecipe } from "./aiRecipes";
import { clearAllData, exportBackup, importBackup, parseBackup, summarizeBackup } from "./backup";
import { clearPlan, dateKey, getPlan, pruneOldPlans, setPlan } from "./dayPlan";
import { listEquipment, replaceEquipment, toggleEquipment } from "./equipment";
import { isFavorite, listFavorites, toggleFavorite } from "./favorites";
import {
  addCustomIngredient,
  deleteCustomIngredient,
  getPantryRow,
  listCustomIngredients,
  listPantry,
  markRanOut,
  replaceStaples,
  setAvailable,
  setStaple,
  toggleAvailable,
} from "./pantry";
import { getAllSettings, getSetting, setSetting } from "./settings";
import type { Recipe } from "@/lib/schemas/recipe";

const sampleAiRecipe: Recipe = {
  id: "ai-test-1",
  name: "تجربة",
  description: "وصفة تجريبية",
  cuisine: "other",
  mealType: "vegan",
  difficulty: "easy",
  prepMinutes: 5,
  cookMinutes: 10,
  servings: 2,
  ingredients: [{ ref: "onion", role: "required" }],
  equipment: [{ cap: "stovetop", role: "required" }],
  steps: ["اطبخ"],
  source: "ai",
};

beforeEach(async () => {
  await clearAllData();
});

describe("pantry repository", () => {
  it("writes and reads a pantry row", async () => {
    await setAvailable("onion", true);
    const row = await getPantryRow("onion");
    expect(row).toMatchObject({ ingredientId: "onion", available: true, isStaple: false });
    expect(await listPantry()).toHaveLength(1);
  });

  it("removes non-staple rows when they run out", async () => {
    await setAvailable("milk", true);
    await markRanOut("milk");
    expect(await getPantryRow("milk")).toBeUndefined();
  });

  it("keeps the staple pin when a staple runs out", async () => {
    await setStaple("salt", true);
    await markRanOut("salt");
    expect(await getPantryRow("salt")).toMatchObject({ available: false, isStaple: true });
    expect(await toggleAvailable("salt")).toBe(true);
    expect(await getPantryRow("salt")).toMatchObject({ available: true, isStaple: true });
  });

  it("unpinning keeps the item available", async () => {
    await setStaple("rice", true);
    await setStaple("rice", false);
    expect(await getPantryRow("rice")).toMatchObject({ available: true, isStaple: false });
  });

  it("replaceStaples swaps the staple set but leaves fresh items alone", async () => {
    await setAvailable("minced-meat", true);
    await replaceStaples(["salt", "rice"]);
    await replaceStaples(["salt", "flour"]);
    const rows = await listPantry();
    const ids = rows.map((r) => r.ingredientId).sort();
    expect(ids).toEqual(["flour", "minced-meat", "salt"]);
    expect(rows.find((r) => r.ingredientId === "minced-meat")?.isStaple).toBe(false);
  });

  it("adds and deletes custom ingredients together with their pantry row", async () => {
    const custom = await addCustomIngredient({ name: "  دبس خرنوب ", category: "sauces" });
    expect(custom.id.startsWith("custom-")).toBe(true);
    expect(custom.name).toBe("دبس خرنوب");
    expect(await getPantryRow(custom.id)).toMatchObject({ available: true });
    await deleteCustomIngredient(custom.id);
    expect(await listCustomIngredients()).toHaveLength(0);
    expect(await getPantryRow(custom.id)).toBeUndefined();
  });
});

describe("equipment repository", () => {
  it("toggles and replaces equipment", async () => {
    expect(await toggleEquipment("oven")).toBe(true);
    expect(await toggleEquipment("oven")).toBe(false);
    await replaceEquipment(["stove", "blender"]);
    expect((await listEquipment()).map((r) => r.equipmentId).sort()).toEqual(["blender", "stove"]);
  });
});

describe("equipment migration (v2)", () => {
  it("rewrites the old gas stove / electric hob ids to the single stove", async () => {
    const name = "malliqa-migration-test";
    await Dexie.delete(name);

    // A database as version 1 of the app left it.
    const old = new Dexie(name);
    old.version(1).stores({
      pantry: "ingredientId, available, isStaple",
      customIngredients: "id, category",
      equipment: "equipmentId",
      settings: "key",
      favorites: "recipeId, addedAt",
      dayPlan: "date",
      aiRecipes: "id, createdAt",
    });
    await old.table("equipment").bulkPut([
      { equipmentId: "electric-hob", available: true },
      { equipmentId: "gas-stove", available: true },
      { equipmentId: "oven", available: true },
    ]);
    await old.table("pantry").put({ ingredientId: "salt", available: true, isStaple: true, updatedAt: 1 });
    old.close();

    const upgraded = new MalliqaDB(name);
    const ids = (await upgraded.equipment.toArray()).map((row) => row.equipmentId).sort();
    expect(ids).toEqual(["oven", "stove"]);
    // Everything else is untouched.
    expect(await upgraded.pantry.count()).toBe(1);
    upgraded.close();
    await Dexie.delete(name);
  });
});

describe("settings repository", () => {
  it("returns defaults and persists values", async () => {
    expect(await getSetting("onboardingDone")).toBe(false);
    await setSetting("onboardingDone", true);
    await setSetting("excludedMealTypes", ["fish"]);
    const all = await getAllSettings();
    expect(all.onboardingDone).toBe(true);
    expect(all.excludedMealTypes).toEqual(["fish"]);
    expect(all.householdSize).toBe(4);
  });

  it("falls back to the default for corrupted values", async () => {
    await db.settings.put({ key: "householdSize", value: "many" });
    expect(await getSetting("householdSize")).toBe(4);
  });
});

describe("favorites and day plan", () => {
  it("toggles favorites", async () => {
    expect(await toggleFavorite("mujaddara")).toBe(true);
    expect(await isFavorite("mujaddara")).toBe(true);
    expect(await listFavorites()).toHaveLength(1);
    expect(await toggleFavorite("mujaddara")).toBe(false);
  });

  it("keeps one plan per day and prunes old ones", async () => {
    const today = dateKey();
    await setPlan(today, "mujaddara", "builtin");
    await setPlan(today, "shakriyeh", "builtin");
    expect((await getPlan(today))?.recipeId).toBe("shakriyeh");
    await setPlan(dateKey(-5), "old", "builtin");
    await pruneOldPlans();
    expect(await getPlan(dateKey(-5))).toBeUndefined();
    await clearPlan(today);
    expect(await getPlan(today)).toBeUndefined();
  });

  it("formats date keys from local dates", () => {
    const base = new Date(2026, 0, 31);
    expect(dateKey(0, base)).toBe("2026-01-31");
    expect(dateKey(1, base)).toBe("2026-02-01");
  });
});

describe("ai recipes", () => {
  it("saves, lists and deletes", async () => {
    await saveAiRecipe(sampleAiRecipe, "prompt");
    const rows = await listAiRecipes();
    expect(rows).toHaveLength(1);
    expect(rows[0].prompt).toBe("prompt");
    await deleteAiRecipe(sampleAiRecipe.id);
    expect(await listAiRecipes()).toHaveLength(0);
  });
});

describe("backup", () => {
  it("round-trips all user data and never exports the access token", async () => {
    await replaceStaples(["salt", "rice"]);
    await setAvailable("minced-meat", true);
    await replaceEquipment(["stove"]);
    await setSetting("onboardingDone", true);
    await setSetting("aiAccessToken", "secret");
    await toggleFavorite("mujaddara");
    await setPlan(dateKey(), "mujaddara", "builtin");
    await saveAiRecipe(sampleAiRecipe);

    const text = JSON.stringify(await exportBackup());
    expect(text).not.toContain("secret");

    await clearAllData();
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(summarizeBackup(parsed.backup)).toMatchObject({
      pantryAvailable: 3,
      staples: 2,
      equipment: 1,
      favorites: 1,
      aiRecipes: 1,
    });

    await importBackup(parsed.backup);
    expect(await listPantry()).toHaveLength(3);
    expect(await getSetting("onboardingDone")).toBe(true);
    expect(await isFavorite("mujaddara")).toBe(true);
    expect(await listAiRecipes()).toHaveLength(1);
  });

  it("maps equipment ids from old backups to the current ones", async () => {
    await replaceEquipment(["oven"]);
    const backup = await exportBackup();
    backup.data.equipment = [
      { equipmentId: "electric-hob", available: true },
      { equipmentId: "gas-stove", available: true },
      { equipmentId: "blender", available: true },
    ];
    await importBackup(backup);
    expect((await listEquipment()).map((r) => r.equipmentId).sort()).toEqual(["blender", "stove"]);
  });

  it("rejects files that are not valid backups", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, reason: "not-json" });
    expect(parseBackup(JSON.stringify({ app: "other" }))).toEqual({ ok: false, reason: "invalid" });
  });
});
