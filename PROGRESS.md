# PROGRESS — ملّيقة (Malliqa)

Short notes appended at the end of each phase. Scope and order live in `CLAUDE.md`.

## Phase 0 — Foundation ✅

- Next.js 16.4 (App Router, Turbopack) + TypeScript strict + pnpm; Tailwind CSS 4 + daisyUI 5 configured in CSS.
- Two warm food themes (`malliqa`, `malliqa-dark`), RTL root layout, IBM Plex Sans Arabic + Lalezar via `next/font`.
- Dexie v1 schema, typed repositories, `useLiveQuery` hooks. Components never import `db`.
- Vitest: `normalizeArabic()` and repository tests (fake-indexeddb).
- Scripts: `typecheck`, `test`, `test:coverage`, `build:export`.
- Decisions:
  - `cacheComponents` / `partialPrefetching` (on by default in the 16.4 scaffold) are **off**: the app is static +
    client-side Dexie, and Serwist's static route handler relies on `dynamic = 'force-static'`.
  - Serwist: `@serwist/turbopack` works with Turbopack and with `output: 'export'`; the webpack fallback was not needed.
  - Rice, bulgur and flour are default staples (owner decision).

## Phase 1 — Data foundation ✅

- Zod schemas for Ingredient, Equipment, Recipe, Backup (and the user-data rows).
- `ingredients.ts`: ~250 items, 10 categories, 18 groups, 24 default staples (incl. rice, bulgur, flour), aliases for
  Levantine spellings. `equipment.ts`: 12 items mapped to 10 capabilities (a charcoal grill was added under "other").
- Extension to the spec: optional `emoji` on recipes, ingredients and equipment — used instead of photos.
- Integrity test: Zod parse, refs exist, substitutes valid, unique ids/names, no duplicate refs, balance targets.

## Phase 2 — Matching engine ✅

- `matchRecipes` implements CLAUDE.md §5; 100% line/branch coverage on `src/lib/matching`.
- Input has one extra field, `ingredientGroups` (ingredient id → groups), so the engine stays free of data imports and
  custom ingredients can join groups.
- Within a group the engine credits a non-staple member first (tomato juice before tomato paste); `freshUsed` counts
  distinct pantry items. Consequence: butter as a fresh cooking fat counts as 1 for any recipe that needs cooking fat.
- The golden-test staples include bulgur and flour (owner decision), which makes béchamel pasta "almost: [milk]".

## Phase 3 — Onboarding, pantry, equipment ✅

- 2-step wizard (staples → equipment), re-runnable from settings without losing pinned custom items.
- Pantry: search with Arabic normalization and aliases, category chips with counts, «عندي الآن» (tap = نفد),
  quick-add of common items, staples section, long-press / right-click menu (pin, نفد, delete custom), custom
  ingredient sheet (name + category + optional group).

## Phase 4 — Suggestions & recipes ✅ (Gate A passed)

- Home: today/tomorrow, filter chips, sections (جاهزة الآن / ينقصها شيء بسيط / جهّزها الليلة للغد / تحتاج تسوّق /
  hidden unsuitable), pinned plan card, backup reminder.
- Recipes: search, cuisine/time/meal/difficulty filters, favorites filter, "show unsuitable" toggle.
- Detail: pantry check per ingredient (direct / via group / via substitute / missing), equipment, steps, favorite,
  pin to today/tomorrow.
- Gate A checked in the browser: with butter, tomato juice and minced meat added to the default staples and an
  electric hob only, Bolognese is first under «جاهزة الآن» and baked pasta is among the hidden unsuitable recipes.

## Phase 5 — Recipe database ✅ (review still owed)

- 154 recipes: 51 Syrian, 22 Levantine, 13 Arab, 13 Italian, 10 Asian, 30 quick, 15 bakery (56% Arab kitchens).
  Balance targets are asserted in the integrity test.
- Recipes were written from general cooking knowledge, not copied from a source. **The manual spot-check of 10 recipes
  has not been done** — quantities and times should be reviewed by a cook.
- `pnpm recipes:draft` writes Gemini drafts to the git-ignored `_drafts/` folder for human review.

## Phase 6 — PWA, offline, backup ✅ locally (Gate B partly open)

- Manifest (Arabic, RTL, icons 192/512 + maskable), Serwist precache of every page incl. all recipe pages, `/offline`
  fallback, `/api/*` network-only, update banner, offline badge, `navigator.storage.persist()` after onboarding,
  backup export/import with summary + confirm, monthly reminder.
- Verified with the production server stopped: all screens open, pantry edits persist, saved AI recipes open.
- Known behavior: offline, in-app navigation falls back to a full page load from the precache (RSC payloads are not
  cached), so the today/tomorrow switch and filters reset on navigation while offline.
- **Open:** install on Android, airplane mode on a phone, Lighthouse, cross-browser backup import.

## Phase 7 — AI assistant ✅ code complete (real requests not run)

- `POST /api/ai/suggest`: Zod request, optional `x-app-token`, structured JSON output, name → id mapping, one retry,
  Arabic errors (401 / 413 / 400 / 429 / 502 / 503), optional CORS.
- Client sheet: optional filters → results → review → «احفظ في وصفاتي»; saved recipes join matching with an AI badge.
- Checked with a mocked response and the no-key error path. **Open:** 5 consecutive real requests (needs a key).

## Phase 8 — Polish ✅ / release open

- Accessibility pass: 44px tap targets, labels on icon buttons, text contrast raised, focus rings, reduced motion.
- README: setup, env vars, Vercel Firewall rule, how to add a recipe.
- **Open:** deploy to Vercel (not done — nothing has been pushed).

## After v1.0 — owner feedback (2026-11-13)

- Lemon moved from «إضافات» to «الخضار».
- Gas stove and electric/induction hob merged into one item, «غاز / طباخ» (id `stove`). Dexie **version 2** rewrites
  saved `gas-stove` / `electric-hob` rows; old backups are mapped on import; `capabilitiesOf` still accepts the old ids.
- Food processor: custom drawing on the equipment card and its own line icon on recipes (it shared the blender icon).
- **Visitor analytics:** Vercel Web Analytics via `<Analytics />` in the root layout; `/_vercel/*` is network-only in the
  service worker. Checked locally that the page requests `/_vercel/insights/script.js` (404 off Vercel, as expected).
- **Content studio** (`pnpm studio`, `scripts/content-studio/`): a local review page for the owner — every recipe with
  its emoji, ingredients and steps; per-recipe course (أساسية / مقبلات / حلويات), comment, replacement emoji and a
  "reviewed" mark; free-text drafts of new recipes; general notes. Saves to `content/recipe-review.json`; the workflow
  for applying it is CLAUDE.md §12. The course is not in the app yet — the owner classifies first.
- Filter chips no longer scroll horizontally (they were cut off with no way to reach the rest on desktop): the quick
  filters are three rows of equal-width chips, pantry categories and cuisines wrap, and the recipes page keeps
  cuisine/time/type/difficulty in a «فلاتر» panel with an active-filter count.
