# ملّيقة — Malliqa

A light, offline-first kitchen assistant that answers one question:
**«ماذا أطبخ اليوم أو غداً بما عندي في البيت؟»**

Single user, no login, Arabic RTL, installable PWA. Everything except the optional AI assistant runs on the device.

- **154 recipes** — Syrian, Levantine and Arab kitchens first, plus Italian, Asian, quick meals and bakery.
- **~250 ingredients** with Arabic aliases (بندورة / طماطم) and ingredient groups (any tomato base, any melting cheese…).
- **Matching engine** that ranks recipes by what you can cook now and by how many fresh (non-staple) items they use.
- **Today / tomorrow** switch: recipes that need soaking, marinating or rising move to «جهّزها الليلة للغد».
- **Backup** to a JSON file, **AI suggestions** via Gemini (reviewed before saving).

Scope, architecture rules and phase order live in [CLAUDE.md](CLAUDE.md); progress notes in [PROGRESS.md](PROGRESS.md).

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS 4 + daisyUI 5 · Dexie 4 (IndexedDB) · Zod 4 ·
Serwist (`@serwist/turbopack`) · `@google/genai` · Vitest · pnpm.

## Setup

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000. The first run starts the onboarding wizard (staples, then equipment).

The AI assistant is optional. To enable it locally, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

### Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Development server (the service worker is disabled in dev) |
| `pnpm build` / `pnpm start` | Production build and server (with the service worker) |
| `pnpm build:export` | Builds with `output: 'export'` into `out/` to prove nothing depends on a server (Capacitor readiness). Moves `src/app/api` aside during the build and restores it |
| `pnpm lint` · `pnpm typecheck` | ESLint · `tsc --noEmit` |
| `pnpm test` · `pnpm test:coverage` | Vitest; coverage enforces ≥ 90% lines on `src/lib/matching` |
| `pnpm icons` | Regenerates the PWA icons in `public/icons` from `scripts/generate-icons.mjs` |
| `pnpm recipes:draft <cuisine> <count> [hint]` | Dev-only: asks Gemini for draft recipes and writes them to `src/data/recipes/_drafts/` for human review |
| `pnpm studio` | Dev-only: the content studio at http://localhost:3220 — review, classify and comment on every recipe (see below) |

Every phase ends with `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | server | Required for `/api/ai/suggest`. Never prefix with `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | server | Model name, default `gemini-3.5-flash-lite` |
| `APP_ACCESS_TOKEN` | server | Optional shared secret. When set, the route requires it in the `x-app-token` header; enter it once in **إعدادات → رمز الوصول** |
| `ALLOWED_ORIGINS` | server | Optional comma-separated origins for CORS (future Capacitor build) |
| `NEXT_PUBLIC_AI_BASE_URL` | client | Optional base URL of the deployment serving `/api/ai/*`. Empty = same origin |

Without `GEMINI_API_KEY` the app works fully; the assistant answers with a clear Arabic error.

## Deploying to Vercel

1. Import the repository in Vercel (framework preset: Next.js, package manager: pnpm).
2. Add the environment variables above.
3. Deploy.

### Protect the AI route (do this before sharing the URL)

The route has no login, so anyone who knows the URL can spend your Gemini quota. Use all three:

1. **Vercel Firewall rate limit** — Project → **Firewall** → **Configure** → **New Rule**:
   - **Name:** `Rate limit AI`
   - **If:** `Request Path` · `Starts with` · `/api/ai/`
   - **Then:** `Rate Limit` — Fixed Window, **60 seconds**, **10 requests**, key: **IP Address**
   - **Action when exceeded:** `Deny` (responds with 429)
   - Save, then **Review Changes → Publish**.
2. **Spend cap** — in Google AI Studio / Google Cloud billing, set a monthly budget and cap for the API key's project.
3. **Access token** (recommended for a family app) — set `APP_ACCESS_TOKEN` in Vercel and enter the same value in the app's settings on each device.

The route also validates the request size and shape with Zod (≤ 60 ingredient names, ≤ 50 excluded recipe names, 3–5 recipes).

## Content studio (internal review page)

```bash
pnpm studio
```

Opens a local page at **http://localhost:3220** for the owner / content writer. It is not part of the app: nothing in
`src/` imports it, and it is never built or deployed.

- Lists every built-in recipe straight from `src/data` with its emoji, ingredients (groups expanded), substitutes,
  equipment and steps. Search uses the same Arabic normalization as the app.
- Per recipe: a **course** (أساسية / مقبلات / حلويات), a free-text **comment or correction**, an optional replacement
  emoji, and a «راجعتها وهي صحيحة» mark. Keys: `↑` `↓` move, `1` `2` `3` classify, `C` comment, `/` search.
- **«+ طبخة جديدة»** drafts a recipe in free text (name, ingredients and steps one per line).
- **«ملاحظات عامة»** holds notes that are not about one recipe.

Everything autosaves to [`content/recipe-review.json`](content/recipe-review.json) (created on the first edit). Commit
that file like any other. The notes are then applied to the code — by hand or by an AI assistant, following "Content
review workflow" in [CLAUDE.md](CLAUDE.md). If the file changes on disk while the page is open, the page refuses to
overwrite it and asks for a reload. The server restarts itself when recipe files change; reload the page to see edits.

## How to add a recipe

1. Open the file of its cuisine in [`src/data/recipes/`](src/data/recipes) (`syrian.ts`, `levantine.ts`, `arab.ts`, `italian.ts`, `asian.ts`, `quick.ts`, `bakery.ts`).
2. Append an object — nothing else needs wiring:

```ts
{
  id: "burghul-with-tomato",          // kebab-case English, unique, never changes
  name: "برغل ببندورة",
  nameEn: "Bulgur with tomato",        // optional
  emoji: "🍅",                          // shown instead of a photo
  description: "برغل مفلفل بالبندورة والبصل.",
  mealType: "vegan",                   // meat | chicken | fish | vegetarian | vegan
  difficulty: "easy",                  // easy | medium | hard
  prepMinutes: 5,
  cookMinutes: 25,
  servings: 4,
  // advancePrep: { kind: "soak", hours: 8, note: "…" },   // soak | marinate | rise | chill
  ingredients: [
    req("bulgur", 2, "cup"),           // required, with amount and unit
    req(g("tomato-base"), 400, "g"),   // any member of a group satisfies it
    req("salt"),                       // no amount = to taste
    opt("dried-mint", 1, "tsp"),       // optional: never changes the status
  ],
  // substitutes: [{ for: "bulgur", use: [g("rice-any")], note: "…" }],
  equipment: need("stovetop"),         // [...need("oven"), ...nice("stand-mixer")]; [] = no cooking
  steps: ["…", "…"],
  tags: ["برغل", "صيامي"],
},
```

3. Run `pnpm test`. The integrity test fails if an ingredient id or group does not exist, an id or name is duplicated, a substitute points at nothing, or a step is empty.

Units: `g kg ml l tsp tbsp cup piece pinch to-taste`. Time bucket (quick ≤ 30 min, medium 31–60, long > 60) is computed from `prepMinutes + cookMinutes`, never stored.

### Adding an ingredient

Append a line to [`src/data/ingredients.ts`](src/data/ingredients.ts):

```ts
{ id: "carob-molasses", name: "دبس خرنوب", nameEn: "Carob molasses", emoji: "🟤", aliases: ["دبس الخروب"], category: "sauces", groups: [], common: false },
```

Ids are stable forever (pantry rows and backups reference them). `aliases` power search and the AI name mapping; `groups` let recipes ask for "any of"; `defaultStaple` pre-checks it in onboarding; `common` shows it before «المزيد».

## How it works

- **Static data lives in code** (`src/data/`), **user data lives in IndexedDB** (Dexie): pantry, custom ingredients, equipment, settings, favorites, day plan, saved AI recipes. Components only talk to `src/lib/db/repositories/*`.
- **Matching** (`src/lib/matching/`) is a pure function: no React, no Dexie, no browser APIs. Status by missing required ingredients: 0 → ready, 1–2 → almost, ≥ 3 → shopping; a missing required capability (oven, …) → unsuitable. Ranking: status → fewer missing → more fresh items used → shorter → name. The match percentage is display only.
- **Offline**: the service worker precaches the app shell and every page, including all `/recipes/[id]` pages. `/api/*` is network-only. Updates wait behind a «يوجد إصدار جديد — حدّث» banner.
- **AI**: the client sends only ingredient *names*, equipment capabilities, optional filters and recipe names to avoid. The server validates with Zod, maps names to dictionary ids (unknown names become flagged `custom:<name>` refs), retries once on invalid output, and never writes anything. The user reviews and decides what to save.
- **Backup**: `{ app: 'kitchen-assistant', backupVersion: 1, exportedAt, data }`, validated with Zod before import; import shows a summary and asks before replacing. The AI access token is never exported.

## Verification status

Verified locally (`pnpm build && pnpm start`, Chromium):

- Golden test (unit) and Gate A through the UI: Bolognese under «جاهزة الآن», baked pasta hidden as unsuitable.
- Service worker installs and precaches all pages; with the server stopped every screen opens, pantry edits persist, saved AI recipes open, unknown URLs show the offline page; the update banner activates a new version.
- AI client flow with a mocked response (request shape, review, save, matching); the route's error paths (no key → 503).
- `pnpm build:export` succeeds.

Not verified here — needs your devices and keys:

- Real Gemini requests (needs `GEMINI_API_KEY`).
- Install on Android Chrome, airplane-mode run on a phone, Lighthouse installability.
- Backup export on one browser → import on another (the round trip is covered by unit tests only).
- Vercel deployment and the Firewall rule.
