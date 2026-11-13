import {
  aiErrorResponseSchema,
  aiSuggestResponseSchema,
  type AiSuggestRequest,
} from "@/lib/schemas/ai";
import type { Recipe } from "@/lib/schemas/recipe";

// Fetch wrapper used by the UI. The base URL is configurable so a future
// Capacitor build (static export) can point at the Vercel deployment.
const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL ?? "";

export type AiSuggestResult = { ok: true; recipes: Recipe[] } | { ok: false; message: string };

const GENERIC_ERROR = "تعذّر الحصول على اقتراحات الآن. حاول مرة أخرى بعد قليل.";

export async function requestSuggestions(
  request: AiSuggestRequest,
  options: { accessToken?: string; signal?: AbortSignal } = {},
): Promise<AiSuggestResult> {
  let response: Response;
  try {
    response = await fetch(`${AI_BASE_URL}/api/ai/suggest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.accessToken ? { "x-app-token": options.accessToken } : {}),
      },
      body: JSON.stringify(request),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, message: "لا يوجد اتصال بالإنترنت. المساعد يحتاج إلى الشبكة." };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }

  if (!response.ok) {
    const parsedError = aiErrorResponseSchema.safeParse(payload);
    return { ok: false, message: parsedError.success ? parsedError.data.error : GENERIC_ERROR };
  }

  // The server already validated; validate again before anything is rendered.
  const parsed = aiSuggestResponseSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
  return { ok: true, recipes: parsed.data.recipes };
}
