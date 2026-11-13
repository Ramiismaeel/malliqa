import { ApiError, GoogleGenAI } from "@google/genai";
import { toRecipe } from "@/lib/ai/map-recipe";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "@/lib/ai/prompt";
import { aiGeneratedSchema, aiResponseJsonSchema, aiSuggestRequestSchema } from "@/lib/schemas/ai";
import type { Recipe } from "@/lib/schemas/recipe";

// The only server code in the app. Gemini never mutates user data: the
// recipes go back to the client for review, and the user decides what to save.

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_BODY_BYTES = 16_000;
const MAX_ATTEMPTS = 2; // one retry on invalid output

export const maxDuration = 60;

function corsHeaders(request: Request): Record<string, string> {
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin");
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-app-token",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(request: Request, body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...corsHeaders(request) },
  });
}

function tokenMatches(provided: string | null, expected: string): boolean {
  if (provided === null || provided.length !== expected.length) return false;
  // Constant-time comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Calls Gemini once and returns app recipes, or `null` when the output is invalid. */
async function generate(ai: GoogleGenAI, model: string, prompt: string, count: number): Promise<Recipe[] | null> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    // No sampling params (temperature / topP / topK): deprecated on new models.
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: aiResponseJsonSchema,
    },
  });

  const text = response.text;
  if (!text) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = aiGeneratedSchema.safeParse(raw);
  if (!parsed.success) return null;

  const recipes: Recipe[] = [];
  for (const generated of parsed.data.recipes.slice(0, count)) {
    try {
      recipes.push(toRecipe(generated, `ai-${crypto.randomUUID()}`));
    } catch {
      // Skip a single recipe that does not map to a valid Recipe.
    }
  }
  return recipes.length > 0 ? recipes : null;
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<Response> {
  const expectedToken = process.env.APP_ACCESS_TOKEN;
  if (expectedToken && !tokenMatches(request.headers.get("x-app-token"), expectedToken)) {
    return json(request, { error: "رمز الوصول غير صحيح. أدخله من الإعدادات." }, 401);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(request, { error: "المساعد غير مفعّل على هذا الخادم (ينقص مفتاح Gemini)." }, 503);
  }

  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return json(request, { error: "الطلب أكبر من المسموح." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return json(request, { error: "طلب غير صالح." }, 400);
  }

  const parsedRequest = aiSuggestRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return json(request, { error: "طلب غير صالح." }, 400);
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const prompt = buildUserPrompt(parsedRequest.data);

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const recipes = await generate(ai, model, prompt, parsedRequest.data.count);
      if (recipes) return json(request, { recipes }, 200);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return json(request, { error: "المساعد مشغول الآن. حاول بعد دقيقة." }, 429);
    }
    console.error("[ai/suggest] Gemini request failed", error instanceof Error ? error.message : error);
    return json(request, { error: "تعذّر الاتصال بالمساعد. حاول مرة أخرى بعد قليل." }, 502);
  }

  return json(request, { error: "لم يستطع المساعد تكوين وصفات صالحة هذه المرة. حاول مرة أخرى." }, 502);
}
