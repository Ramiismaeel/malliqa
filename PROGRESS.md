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
