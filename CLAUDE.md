# CLAUDE.md — مساعد المطبخ (Kitchen Assistant)

A light, offline-first home app that answers one question: **"What can I cook today or tomorrow with what I have at home?"**
Single user, no login, Arabic RTL UI, installable PWA, Android via Capacitor later.

This file is the source of truth for scope and order. Work phase by phase. Do not start a phase before the previous phase's "Done when" list passes.

---

## 1. Stack (pinned decisions)

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 App Router + TypeScript (strict) | Turbopack is the default bundler |
| UI | Tailwind CSS 4 + daisyUI 5 | daisyUI 5 is configured in CSS (`@plugin "daisyui";`), no tailwind.config.js. RTL works automatically with `dir="rtl"` |
| Local data | Dexie 4 on IndexedDB | `dexie-react-hooks` → `useLiveQuery` for reactive reads |
| Validation | Zod | One schema per data type, shared by built-in data, AI output and backup files |
| Offline | Serwist | Try `@serwist/turbopack` first; fallback: `@serwist/next` + `next build --webpack` |
| AI | Gemini via `@google/genai`, model from env `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) | Server-side only. Do NOT send `temperature`, `top_p`, `top_k` (deprecated on new models) |
| Hosting | Vercel | |
| Tests | Vitest | Playwright is out of scope for v1 |
| Package manager | pnpm | |

Not used in v1: Zustand, Redux, any ORM, any auth, any cloud DB, i18n frameworks, image hosting.

Before installing, check the current docs of Serwist, daisyUI and the Gemini SDK — APIs move fast. Prefer the official docs over memory.

---

## 2. Architecture rules (never break these)

1. **Local-first.** Matching, pantry, equipment, recipes, favorites and day plans work 100% offline. The server is used ONLY by `/api/ai/*`.
2. **Static data lives in code, user data lives in Dexie.** Recipes, ingredient dictionary and equipment are TypeScript modules in `src/data/`. They are never copied into IndexedDB.
3. **The matching engine is a pure function** in `src/lib/matching/` — no React, no Dexie, no browser APIs. Fully unit-tested.
4. **Repository layer.** Components never import `db` directly. They use `src/lib/db/repositories/*` (and hooks that wrap them).
5. **No Server Actions and no data fetching in Server Components.** Every page must render from the static build + client-side Dexie reads. Pages that read Dexie are client components.
6. **Static-export compatible.** Except `app/api/**`, the app must build with `output: 'export'`. No `cookies()`, `headers()`, middleware-dependent pages, or runtime-only dynamic routes. Dynamic recipe pages use `generateStaticParams`. AI recipes are viewed at `/my-recipes/view?id=...` (query param, client-side).
7. **AI base URL is configurable.** Client calls `${process.env.NEXT_PUBLIC_AI_BASE_URL ?? ''}/api/ai/suggest` so a future Capacitor build can point to the Vercel deployment.
8. **Gemini never mutates user data.** AI results are shown for review; the user decides to save them.
9. **API key never reaches the client.** `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix.
10. **RTL everywhere.** `<html lang="ar" dir="rtl">`. Use logical Tailwind utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`). Never `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`.

---

## 3. Project structure

```
src/
├── app/
│   ├── layout.tsx              # html lang=ar dir=rtl, font, bottom nav, SW registration
│   ├── page.tsx                # Home: suggestions (today/tomorrow)
│   ├── onboarding/page.tsx     # first-run wizard
│   ├── pantry/page.tsx         # "مطبخي": ingredients + equipment tabs
│   ├── recipes/page.tsx        # browse + search + filters
│   ├── recipes/[id]/page.tsx   # recipe detail (generateStaticParams)
│   ├── my-recipes/page.tsx     # saved AI recipes list
│   ├── my-recipes/view/page.tsx# AI recipe detail via ?id=
│   ├── settings/page.tsx       # preferences, backup, about
│   ├── offline/page.tsx        # SW fallback
│   ├── manifest.ts
│   ├── sw.ts                   # Serwist service worker source
│   └── api/ai/suggest/route.ts # the only server code
├── components/
│   ├── ui/                     # small daisyUI wrappers (Chip, Section, EmptyState…)
│   ├── layout/                 # BottomNav, OnlineBadge, UpdateBanner
│   ├── recipes/                # RecipeCard, RecipeFilters, MissingList, EquipmentBadges
│   └── pantry/                 # CategoryChips, IngredientToggle, AddCustomIngredient
├── data/
│   ├── categories.ts
│   ├── ingredients.ts          # dictionary + groups
│   ├── equipment.ts
│   └── recipes/
│       ├── index.ts            # exports allRecipes (validated in tests)
│       ├── syrian.ts
│       ├── levantine.ts
│       ├── arab.ts
│       ├── italian.ts
│       ├── asian.ts
│       ├── quick.ts
│       └── bakery.ts
├── lib/
│   ├── schemas/                # zod: ingredient, equipment, recipe, backup, ai
│   ├── db/
│   │   ├── dexie.ts            # db + versioned schema
│   │   └── repositories/       # pantry, equipment, settings, favorites, dayPlan, aiRecipes, backup
│   ├── matching/
│   │   ├── matchRecipes.ts
│   │   ├── resolveAvailability.ts
│   │   ├── timeBucket.ts
│   │   └── matchRecipes.test.ts
│   ├── text/arabic.ts          # normalizeArabic() for search
│   └── ai/
│       ├── client.ts           # fetch wrapper used by UI
│       └── prompt.ts           # server-side prompt builder
└── types/
```

---

## 4. Data model

### 4.1 Static data (`src/data/`)

```ts
// categories.ts
type IngredientCategory =
  | 'meat'        // اللحوم والبروتينات (لحم، دجاج، سمك) — eggs live in dairy-eggs
  | 'vegetables'  // الخضار
  | 'fruits'      // الفواكه
  | 'grains'      // الحبوب والنشويات (أرز، برغل، معكرونة، طحين، خبز)
  | 'legumes'     // البقوليات (عدس، حمص، فول، فاصولياء)
  | 'dairy-eggs'  // الألبان والبيض
  | 'spices'      // التوابل والأعشاب
  | 'sauces'      // الصلصات والمعلبات
  | 'oils'        // الزيوت والدهون
  | 'other';      // إضافات (سكر، خل، ليمون، مكسرات…)

type EquipmentCategory = 'cooking' | 'baking' | 'electric' | 'other';
```

```ts
// ingredients.ts
interface Ingredient {
  id: string;              // kebab-case English, stable forever: 'minced-meat'
  name: string;            // Arabic display name: 'لحم مفروم'
  nameEn?: string;
  aliases: string[];       // Arabic/Levantine variants: ['لحمة مفرومة', 'كفتة نية']
  category: IngredientCategory;
  groups?: string[];       // e.g. ['tomato-base']
  defaultStaple?: boolean; // pre-checked in onboarding
  common?: boolean;        // shown before "show more" in pantry lists
}

interface IngredientGroup {
  id: string;              // 'tomato-base'
  name: string;            // 'قاعدة طماطم'
}
```

Required groups at minimum: `tomato-base` (fresh tomato, tomato juice, paste, passata, canned tomatoes), `cheese-melting`, `cheese-white`, `stock` (stock cube, broth), `cooking-fat` (oil, butter, ghee), `yogurt-any`, `bread-any`, `rice-any`, `pasta-any`, `chili`, `fresh-herbs`.

```ts
// equipment.ts
interface Equipment {
  id: string;                 // 'gas-stove'
  name: string;               // 'موقد غاز'
  category: EquipmentCategory;
  provides: Capability[];     // what recipes can rely on
}
type Capability =
  | 'stovetop' | 'oven' | 'microwave' | 'air-fryer' | 'blender'
  | 'hand-mixer' | 'stand-mixer' | 'food-processor' | 'pressure-cooker' | 'grill';
```

Equipment list v1: gas stove, electric/induction hob (both provide `stovetop`), oven, microwave, air fryer, blender, hand mixer, stand mixer, food processor, pressure cooker, electric grill.

```ts
// Recipe (src/lib/schemas/recipe.ts)
interface Recipe {
  id: string;
  name: string;
  nameEn?: string;
  description: string;                 // one line
  cuisine: 'syrian' | 'levantine' | 'arab' | 'italian' | 'asian' | 'quick' | 'bakery' | 'other';
  mealType: 'meat' | 'chicken' | 'fish' | 'vegetarian' | 'vegan';
  difficulty: 'easy' | 'medium' | 'hard';
  prepMinutes: number;
  cookMinutes: number;
  advancePrep?: { kind: 'soak' | 'marinate' | 'rise' | 'chill'; hours: number; note?: string };
  servings: number;
  ingredients: Array<{
    ref: string;                       // ingredient id OR 'group:<groupId>'
    amount?: number;
    unit?: 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'piece' | 'pinch' | 'to-taste';
    role: 'required' | 'optional';
    note?: string;                     // 'مفروم ناعم'
  }>;
  substitutes?: Array<{ for: string; use: string[]; note?: string }>;
  equipment: Array<{ cap: Capability; role: 'required' | 'optional' }>;
  steps: string[];                     // short Arabic steps
  tags?: string[];
  source: 'builtin' | 'ai';
}
```

Time bucket is **computed**, never stored: `quick` ≤ 30 min, `medium` 31–60, `long` > 60 (prep + cook; advancePrep hours are shown separately).

### 4.2 User data (Dexie, `src/lib/db/dexie.ts`)

```ts
db.version(1).stores({
  pantry:            'ingredientId, available, isStaple',   // { ingredientId, available, isStaple, updatedAt }
  customIngredients: 'id, category',                        // { id: 'custom-<uuid>', name, category, groups? }
  equipment:         'equipmentId',                         // { equipmentId, available }
  settings:          'key',                                 // key/value: onboardingDone, householdSize, excludedMealTypes, aiAccessToken?
  favorites:         'recipeId, addedAt',
  dayPlan:           'date',                                // { date: 'YYYY-MM-DD', recipeId, source }
  aiRecipes:         'id, createdAt',                       // Recipe (source:'ai') + { createdAt, prompt }
});
```

- Missing pantry row = not available.
- Staples: `available: true, isStaple: true`. They never auto-change. The user toggles them manually.
- Every schema change = new `db.version(n)` with an upgrade function. Never edit an old version.

### 4.3 Backup file

```ts
{ app: 'kitchen-assistant', backupVersion: 1, exportedAt: ISOString, data: { pantry, customIngredients, equipment, settings, favorites, dayPlan, aiRecipes } }
```
Validated with Zod before import. Import shows a summary and asks: replace all / cancel. Never overwrite silently.

---

## 5. Matching engine spec (`src/lib/matching/`)

```ts
matchRecipes(input: {
  recipes: Recipe[];
  availableIngredientIds: Set<string>;   // pantry available (incl. staples) + custom
  stapleIds: Set<string>;
  capabilities: Set<Capability>;         // derived from available equipment
  day: 'today' | 'tomorrow';
  filters?: { time?: TimeBucket[]; difficulty?: Difficulty[]; mealType?: MealType[]; cuisine?: Cuisine[] };
  excludedMealTypes?: MealType[];
}): MatchResult[]
```

Per recipe:

1. Expand availability with groups: an ingredient in `availableIngredientIds` satisfies every `group:*` it belongs to.
2. Equipment: any `required` capability missing → `status: 'unsuitable'`, `missingEquipment` listed.
3. For each `required` ingredient: `have` (direct), `have-via-group`, `have-via-substitute` (record which), or `missing`.
4. Status by missing required count: `0 → 'ready'`, `1–2 → 'almost'`, `≥3 → 'shopping'`. Optional ingredients never change status; they are listed as "يمكن إضافة".
5. `freshUsed` = number of required/optional ingredients the recipe uses that are available AND not staples.
6. Sort: status order (ready, almost, shopping, unsuitable) → missing count asc → `freshUsed` desc → total minutes asc → name.
7. `day === 'today'` and recipe has `advancePrep` → `status` kept, but flag `needsAdvancePrep: true`; UI shows it in a separate "جهّزها الليلة للغد" section. In `tomorrow` mode, these are normal.
8. `matchPercent` = available required / total required × 100 — display only, never used for ranking.

Output per recipe: `{ recipe, status, missing[], viaGroup[], viaSubstitute[], optionalMissing[], missingEquipment[], freshUsed, matchPercent, needsAdvancePrep, timeBucket }`.

**Golden test (must exist and pass):** pantry = onion, butter, pasta, tomato-juice, minced-meat + staples (salt, black-pepper, mixed-spices, oil, garlic, coriander, bread, rice); equipment = electric hob only.
- `spaghetti-bolognese` → ready, `freshUsed ≥ 4`, ranked above `rice-with-vermicelli`.
- `baked-pasta-with-meat` → unsuitable (oven).
- A recipe needing milk (e.g. stovetop béchamel pasta) → almost, missing = [milk].

---

## 6. UX notes

- Mobile-first, bottom nav with 4 tabs: **اقتراحات** (home), **مطبخي** (pantry), **وصفات**, **إعدادات**.
- Home: segmented control **اليوم | غداً** at top → sections: "جاهزة الآن", "ينقصها شيء بسيط", "جهّزها الليلة للغد" (today mode only), collapsed "تحتاج تسوّق". Quick filter chips: سريعة/متوسطة/طويلة, سهلة/متوسطة/صعبة, لحوم/دجاج/سمك/نباتي. AI button at the bottom ("اقترح لي أفكاراً جديدة"), disabled offline.
- Recipe card: name, time + bucket, difficulty, equipment icons (stovetop/oven/blender…), missing items in red, "via substitute" in amber.
- Recipe detail: ingredients with ✓/✗ against pantry, missing list, equipment, steps, favorite button, "ثبّت لليوم / للغد".
- Pantry: category chips → toggles. Available items first. Search with Arabic normalization. Staples marked with a pin icon; long-press or menu to (un)mark staple. "نفد" quick action. Add custom ingredient (name + category).
- Onboarding (first run only, re-runnable from settings): (1) staples — `defaultStaple` items pre-checked, grouped by category; (2) equipment — stove pre-checked; (3) done → home. Preferences are optional in settings, not in onboarding.
- Arabic numerals: use Western digits (0–9) for consistency with times. Units in Arabic (غ، مل، ملعقة كبيرة…).
- Empty states everywhere (no pantry items, no matches, offline AI).

---

## 7. AI route spec (`app/api/ai/suggest/route.ts`)

- `POST`, body validated with Zod: `{ ingredients: string[] (≤60), equipment: Capability[], timeBucket?, cuisine?, mealType?, exclude: string[] (≤50 recipe names), count: 3..5 }`.
- Optional header `x-app-token` checked against env `APP_ACCESS_TOKEN` when that env is set.
- Calls Gemini with structured JSON output (response schema = array of Recipe-like objects with Arabic text). No sampling params.
- Server validates with Zod, maps ingredient names to dictionary IDs via `normalizeArabic` + aliases; unknown names become `custom:<name>` refs flagged in the result. Invalid output → one retry → `502` with an Arabic error message.
- Response: `{ recipes: Recipe[] (source:'ai') }`. The client validates again before rendering.
- Rate limiting is configured in Vercel Firewall (document the rule in README); also set a spend cap in Google AI Studio.
- Env: `GEMINI_API_KEY`, `GEMINI_MODEL`, `APP_ACCESS_TOKEN?`, `ALLOWED_ORIGINS?` (for future Capacitor CORS).

---

## 8. Phases

Each phase ends with: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green, and a short note appended to `PROGRESS.md`.

### Phase 0 — Foundation
- Scaffold Next.js 16 + TS strict + pnpm. Tailwind 4 + daisyUI 5 (one light theme + one dark theme, warm food palette).
- `layout.tsx`: `lang="ar" dir="rtl"`, Arabic font via `next/font` (IBM Plex Sans Arabic or Cairo), bottom nav, page shell.
- Dexie db with version 1 schema, repositories with typed methods, `useLiveQuery` hooks.
- Vitest configured; `normalizeArabic()` + tests.
- Scripts: `typecheck`, `test`, `build:export` (temporarily moves/excludes `app/api` and builds with `output: 'export'`).

**Done when:** empty pages for all 4 tabs render RTL; a test writes and reads a pantry row via the repository (fake-indexeddb); `build:export` succeeds.

### Phase 1 — Data foundation
- Zod schemas for Ingredient, Equipment, Recipe, Backup.
- `ingredients.ts` (~200–250 items across all categories, with aliases and groups; mark ~25 `defaultStaple`, ~80 `common`).
  Default staples: ملح، فلفل أسود، بهارات مشكلة، كمون، كزبرة يابسة، بابريكا، قرفة، زيت نباتي، زيت زيتون، سمن، بصل، ثوم، سكر، طحين، أرز، برغل، معكرونة، شعيرية، رب البندورة، خبز، ليمون، خل، مرقة مكعبات، نعنع يابس.
- `equipment.ts`.
- First **22 recipes** (they cover the golden test, oven exclusion, advancePrep and both cuisines): مجدرة، شوربة عدس، فتة حمص، مقلوبة باذنجان، شيخ المحشي، كبة بالصينية، داود باشا، فاصولياء خضراء بالزيت، بامية باللحمة، شاكرية، شكشوكة، فول مدمس، فريكة بالدجاج، مناقيش زعتر، معكرونة بولونيز، معكرونة بصلصة البندورة، معكرونة بالبشاميل على الموقد، أومليت، أرز مقلي، كاري دجاج، معكرونة باللحمة بالفرن، أرز بشعيرية.
- Data integrity test: every recipe parses with Zod; every `ref` exists (ingredient id or known group); every substitute target exists; ids unique; no empty steps.

**Done when:** integrity test passes for all recipes.

### Phase 2 — Matching engine
- Implement section 5 exactly. Pure functions, no imports from React/Dexie.
- Tests: golden test, groups, substitutes, optional ingredients, equipment exclusion, today/tomorrow advancePrep, filters, ranking order, custom ingredients.

**Done when:** all matching tests pass with ≥90% line coverage on `src/lib/matching`.

### Phase 3 — Onboarding, pantry, equipment
- Onboarding wizard (2 steps) writing through repositories; redirect to onboarding when `onboardingDone` is false.
- Pantry screen: category chips, toggles, staple pin, "نفد", search, add custom ingredient, equipment tab.

**Done when:** first run → onboarding → staples persist after reload; adding 3 items takes < 20 s; custom ingredient appears in search and in matching.

### Phase 4 — Suggestions & recipes  *(Gate A: the core works)*
- Home with today/tomorrow, sections, filter chips, recipe cards.
- Recipes browse page: search (normalized Arabic), filters, "show unsuitable" toggle.
- Recipe detail page with pantry check, missing list, steps, favorite, pin to today/tomorrow (`dayPlan`).
- Favorites shown on recipes page as a filter.

**Gate A:** with the golden-test pantry entered via the UI, the home page shows Bolognese under "جاهزة الآن" and baked pasta hidden as unsuitable.

### Phase 5 — Recipe database expansion
- Reach ~80–120 recipes (≈60% Syrian/Levantine/Arab, ≈40% international). Balance: ≥25 quick, ≥20 vegetarian, ≥10 no-oven-no-stove-optional (salads, sandwiches).
- Allowed workflow: a dev-only script `scripts/generate-recipes.ts` that calls Gemini and writes draft files to `src/data/recipes/_drafts/`; a human reviews and moves them. Drafts are never imported by the app.
- Integrity test must stay green.

**Done when:** count + balance targets met; integrity test green; spot-check 10 recipes manually.

### Phase 6 — PWA, offline, backup  *(Gate B: works installed and offline)*
- `manifest.ts` (Arabic name, `dir: 'rtl'`, `lang: 'ar'`, theme colors, icons 192/512 + maskable).
- Serwist service worker: precache app shell, all static routes, `/recipes/[id]` pages, fonts; `/offline` fallback; `/api/ai/*` network-only.
- Update banner ("يوجد إصدار جديد — حدّث") instead of silent reload.
- Online/offline badge.
- `navigator.storage.persist()` after onboarding.
- Backup export/import in settings (Zod-validated, confirm before replace) + monthly reminder.

**Gate B:** install on Android Chrome and desktop; airplane mode → every screen, matching and pantry edits work; export on one browser → import on another restores state; Lighthouse marks the app installable.

### Phase 7 — AI assistant
- Implement section 7. Client: "اقترح لي" sheet with optional filters → results list → detail → "احفظ في وصفاتي".
- Saved AI recipes appear in "وصفاتي" and are included in matching (with an "AI" badge).
- Settings field for access token (if `APP_ACCESS_TOKEN` is used).

**Done when:** 5 consecutive real requests return valid recipes; malformed output is handled; offline shows a clear disabled state; key absent from client bundle (grep the build output).

### Phase 8 — Polish & release v1.0
- Accessibility pass (labels, focus, contrast, tap targets ≥ 44px), dark mode check, empty states, loading states.
- README: setup, env vars, Vercel Firewall rate-limit rule, how to add a recipe.
- Deploy to Vercel.

**Done when:** all MVP acceptance criteria in section 9 pass.

---

## 9. MVP acceptance criteria

- [ ] First-run setup in under 2 minutes; staples persist across reloads and restarts.
- [ ] Daily pantry update (3 items) in under 20 seconds.
- [ ] Golden test passes (unit + manually via UI).
- [ ] Recipes requiring missing equipment never appear as "ready".
- [ ] Installed app works fully in airplane mode (except AI).
- [ ] Backup export → import on another browser restores the same state.
- [ ] Gemini returns Zod-valid recipes that can be saved and matched.
- [ ] `build:export` succeeds (Capacitor readiness).

---

## 10. Out of scope until v1.0 ships (do NOT build)

Quantities/units in pantry, low-stock state, expiry dates, weekly planner, shopping list, cooking mode, cooking history, servings scaling, recipe images, AI substitutes screen, notifications, camera/barcode, accounts, sync, sharing, Capacitor project.

Planned for v1.1: shopping list from missing items, weekly planner (extends `dayPlan`), cooking mode, quantities.
Planned for v1.2: cooking history + variety in suggestions, images, servings scaling, Capacitor Android build.

---

## 11. Conventions

- Code, identifiers, comments, commits: English. UI text: Arabic, kept in the component (no i18n layer in v1) — but no Arabic strings inside `src/lib/matching`.
- Components: function components, named exports, files in kebab-case.
- Client components only where needed (`'use client'` at page level for Dexie pages is fine).
- No `any`. Zod `infer` types are the single source of types for data.
- Small commits per task; update `PROGRESS.md` at the end of each phase.
- When unsure about scope, re-read sections 2 and 10 before adding anything.
