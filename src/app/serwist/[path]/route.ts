import { createSerwistRoute } from "@serwist/turbopack";
import { allRecipes } from "@/data/recipes";

// Serves the service worker at /serwist/sw.js. The route is fully static
// (`force-static` + generateStaticParams), so it also works with
// `output: 'export'`.

// One revision per build: every deploy refreshes the precached pages.
const revision = crypto.randomUUID();

const staticPages = ["/", "/onboarding", "/pantry", "/recipes", "/my-recipes", "/my-recipes/view", "/settings", "/offline"];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  // Native esbuild is a devDependency of this project on every platform.
  useNativeEsbuild: true,
  additionalPrecacheEntries: [
    ...staticPages.map((url) => ({ url, revision })),
    // Every built-in recipe page is available offline from the first visit.
    ...allRecipes.map((recipe) => ({ url: `/recipes/${recipe.id}`, revision })),
  ],
});
