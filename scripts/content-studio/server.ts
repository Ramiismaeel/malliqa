// Content studio — a local, dev-only page for reviewing the recipe database.
//
//   pnpm studio        →  http://localhost:3220
//
// It lists every built-in recipe (ingredients, emoji, steps) straight from
// src/data, and lets the owner classify each one, comment on what is wrong or
// missing, and draft new recipes. Everything is saved to
// content/recipe-review.json, which is then applied to the code by hand (or by
// an AI assistant — see "Content review workflow" in CLAUDE.md).
//
// Not part of the app: nothing here is imported by src/, built or deployed.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { z } from "zod";
import { foodArtSvg } from "../../src/data/food-art";
import { groupMembers, ingredientById } from "../../src/data/ingredients";
import { allRecipes } from "../../src/data/recipes";
import { formatAmount, formatHours, formatMinutes, formatServings } from "../../src/lib/format";
import { createRefResolver } from "../../src/lib/kitchen/names";
import {
  advancePrepLabels,
  capabilityLabels,
  cuisineLabels,
  difficultyLabels,
  mealTypeLabels,
  timeBucketLabels,
} from "../../src/lib/labels";
import { timeBucketOf, totalMinutes } from "../../src/lib/matching/timeBucket";
import { courseOf, GROUP_PREFIX, type Recipe } from "../../src/lib/schemas/recipe";
import { normalizeArabic } from "../../src/lib/text/arabic";
import { courses, emptyReview, normalizeReview, reviewSchema, type Review } from "./review";

const PORT = Number(process.env.STUDIO_PORT) || 3220;
const ROOT = process.cwd();
const PAGE_FILE = path.join(ROOT, "scripts", "content-studio", "index.html");
const REVIEW_FILE = path.join(ROOT, "content", "recipe-review.json");
const MAX_BODY_BYTES = 2 * 1024 * 1024;

// ── recipes, resolved to display text ───────────────────────────────────────

const resolveRef = createRefResolver();

function memberNames(ref: string): string[] {
  if (!ref.startsWith(GROUP_PREFIX)) return [];
  return (groupMembers.get(ref.slice(GROUP_PREFIX.length)) ?? [])
    .map((id) => ingredientById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
}

function recipeView(recipe: Recipe) {
  const ingredients = recipe.ingredients.map((item) => {
    const info = resolveRef(item.ref);
    return {
      ref: item.ref,
      name: info.name,
      emoji: info.emoji,
      amount: formatAmount(item),
      optional: item.role === "optional",
      note: item.note ?? "",
      members: memberNames(item.ref),
    };
  });
  const prep = recipe.advancePrep;
  return {
    id: recipe.id,
    name: recipe.name,
    nameEn: recipe.nameEn ?? "",
    emoji: recipe.emoji ?? cuisineLabels[recipe.cuisine].emoji,
    hasOwnEmoji: Boolean(recipe.emoji),
    description: recipe.description,
    cuisine: recipe.cuisine,
    mealType: recipe.mealType,
    course: courseOf(recipe),
    difficulty: difficultyLabels[recipe.difficulty],
    prep: formatMinutes(recipe.prepMinutes),
    cook: formatMinutes(recipe.cookMinutes),
    total: formatMinutes(totalMinutes(recipe)),
    bucket: timeBucketLabels[timeBucketOf(recipe)].label,
    servings: formatServings(recipe.servings),
    advancePrep: prep
      ? `${advancePrepLabels[prep.kind].emoji} ${advancePrepLabels[prep.kind].label} ${formatHours(prep.hours)}${prep.note ? ` — ${prep.note}` : ""}`
      : "",
    ingredients,
    substitutes: (recipe.substitutes ?? []).map((sub) => ({
      for: resolveRef(sub.for).name,
      use: sub.use.map((ref) => resolveRef(ref).name),
      note: sub.note ?? "",
    })),
    equipment: recipe.equipment.map((item) => ({
      label: capabilityLabels[item.cap],
      optional: item.role === "optional",
    })),
    steps: recipe.steps,
    tags: recipe.tags ?? [],
    file: `src/data/recipes/${recipe.cuisine}.ts`,
    search: normalizeArabic(
      [recipe.name, recipe.nameEn ?? "", recipe.id, ...(recipe.tags ?? []), ...ingredients.map((i) => i.name)].join(" "),
    ),
  };
}

const recipeOrder = allRecipes.map((recipe) => recipe.id);

const catalog = {
  recipes: allRecipes.map(recipeView),
  courses,
  cuisines: Object.entries(cuisineLabels).map(([id, info]) => ({
    id,
    ...info,
    count: allRecipes.filter((recipe) => recipe.cuisine === id).length,
  })),
  mealTypes: Object.entries(mealTypeLabels).map(([id, info]) => ({ id, ...info })),
};

// ── review file ─────────────────────────────────────────────────────────────

const revOf = (text: string): string => createHash("sha1").update(text).digest("hex").slice(0, 12);

async function readReview(): Promise<{ rev: string; review: Review }> {
  let text: string;
  try {
    text = await readFile(REVIEW_FILE, "utf8");
  } catch {
    return { rev: "new", review: emptyReview() };
  }
  return { rev: revOf(text), review: reviewSchema.parse(JSON.parse(text)) };
}

async function writeReview(review: Review): Promise<string> {
  const normalized = normalizeReview({ ...review, updatedAt: new Date().toISOString() }, recipeOrder);
  const text = `${JSON.stringify(normalized, null, 2)}\n`;
  await mkdir(path.dirname(REVIEW_FILE), { recursive: true });
  // Write-then-rename, so a crash never leaves half a file.
  const temp = `${REVIEW_FILE}.tmp`;
  await writeFile(temp, text, "utf8");
  await rename(temp, REVIEW_FILE);
  return revOf(text);
}

const saveRequestSchema = z.object({ baseRev: z.string(), review: reviewSchema });

// ── http ────────────────────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, body: unknown, type = "application/json; charset=utf-8"): void {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Only this machine may talk to the studio — it writes files in the repo. */
function isLocal(req: IncomingMessage): boolean {
  const allowed = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];
  if (!allowed.includes(req.headers.host ?? "")) return false;
  const origin = req.headers.origin;
  return !origin || allowed.some((host) => origin === `http://${host}`);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isLocal(req)) return send(res, 403, { error: "forbidden" });
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    return send(res, 200, await readFile(PAGE_FILE, "utf8"), "text/html; charset=utf-8");
  }
  // Drawings used instead of an emoji (`emoji: "art:<name>"`), as images.
  const art = /^\/art\/([a-z0-9-]+)\.svg$/.exec(url.pathname);
  if (req.method === "GET" && art) {
    const svg = foodArtSvg(art[1] ?? "");
    return svg ? send(res, 200, svg, "image/svg+xml; charset=utf-8") : send(res, 404, { error: "not found" });
  }
  if (req.method === "GET" && url.pathname === "/api/catalog") {
    return send(res, 200, catalog);
  }
  if (req.method === "GET" && url.pathname === "/api/review") {
    return send(res, 200, await readReview());
  }
  if ((req.method === "PUT" || req.method === "POST") && url.pathname === "/api/review") {
    const parsed = saveRequestSchema.safeParse(JSON.parse(await readBody(req)));
    if (!parsed.success) return send(res, 400, { error: "invalid review", issues: parsed.error.issues });
    const current = await readReview();
    // The file changed on disk since the page loaded it (edited by hand or by
    // an assistant): refuse instead of overwriting those changes.
    if (current.rev !== parsed.data.baseRev) return send(res, 409, current);
    return send(res, 200, { rev: await writeReview(parsed.data.review) });
  }
  return send(res, 404, { error: "not found" });
}

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error(error);
    send(res, 500, { error: error instanceof Error ? error.message : "server error" });
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\n  ملّيقة — استوديو المحتوى`);
  console.log(`  http://localhost:${PORT}   (${allRecipes.length} recipes)`);
  console.log(`  notes are saved to content/recipe-review.json\n`);
});
