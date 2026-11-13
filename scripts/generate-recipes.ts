// Dev-only helper for growing the recipe database (CLAUDE.md, Phase 5).
//
//   pnpm recipes:draft syrian 5 "أطباق حلبية بالكبة"
//
// Calls Gemini, validates the output with the same Zod schemas the app uses,
// maps ingredient names to dictionary ids and writes a draft file to
// src/data/recipes/_drafts/. Drafts are git-ignored and never imported by the
// app: a human reviews them, fixes `custom:` refs, and moves the good ones
// into the file of their cuisine.
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { allRecipes } from "../src/data/recipes";
import { toRecipe, unknownIngredientNames } from "../src/lib/ai/map-recipe";
import { SYSTEM_INSTRUCTION } from "../src/lib/ai/prompt";
import { ingredients } from "../src/data/ingredients";
import { aiGeneratedSchema, aiResponseJsonSchema } from "../src/lib/schemas/ai";
import { cuisineSchema } from "../src/lib/schemas/recipe";

const [cuisineArg = "syrian", countArg = "5", ...hintParts] = process.argv.slice(2);
const cuisine = cuisineSchema.parse(cuisineArg);
const count = Math.min(Math.max(Number.parseInt(countArg, 10) || 5, 1), 5);
const hint = hintParts.join(" ");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}

const existing = allRecipes.filter((recipe) => recipe.cuisine === cuisine).map((recipe) => recipe.name);

const prompt = [
  `اكتب ${count} وصفات من المطبخ: ${cuisine}.`,
  hint ? `التركيز المطلوب: ${hint}` : "",
  "استعمل أسماء المكونات من هذه القائمة حرفياً كلما أمكن:",
  ingredients.map((ingredient) => ingredient.name).join("، "),
  `وصفات موجودة مسبقاً (لا تكررها): ${existing.join("، ")}`,
]
  .filter(Boolean)
  .join("\n\n");

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  contents: prompt,
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseJsonSchema: aiResponseJsonSchema,
  },
});

const parsed = aiGeneratedSchema.safeParse(JSON.parse(response.text ?? "{}"));
if (!parsed.success) {
  console.error("Model output did not match the schema:\n", parsed.error.message);
  process.exit(1);
}

const slug = (text: string, index: number) =>
  (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `draft-${index + 1}`;

const drafts = parsed.data.recipes.map((generated, index) => ({
  ...toRecipe({ ...generated, cuisine }, slug(generated.nameEn ?? "", index)),
  source: "builtin" as const,
}));

const outDir = "src/data/recipes/_drafts";
mkdirSync(outDir, { recursive: true });
const file = `${outDir}/${cuisine}-${new Date().toISOString().replace(/[:.]/g, "-")}.ts`;
writeFileSync(
  file,
  `// DRAFT — review before moving into src/data/recipes/${cuisine}.ts.\n` +
    `// Replace every "custom:<name>" ref with a dictionary id (or add the ingredient).\n` +
    `import type { Recipe } from "@/lib/schemas/recipe";\n\n` +
    `export const drafts: Recipe[] = ${JSON.stringify(drafts, null, 2)};\n`,
);

console.log(`✓ ${drafts.length} drafts → ${file}`);
for (const draft of drafts) {
  const unknown = unknownIngredientNames(draft);
  console.log(`  - ${draft.name}${unknown.length ? `  (unknown: ${unknown.join("، ")})` : ""}`);
}
