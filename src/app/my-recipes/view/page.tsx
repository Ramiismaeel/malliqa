"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import { EmptyState } from "@/components/ui/empty-state";
import { useAiRecipe } from "@/lib/db/hooks";

// AI recipes live in IndexedDB, so they cannot have prerendered routes.
// One static page reads the id from the query string instead.
function AiRecipeView() {
  const id = useSearchParams().get("id");
  const recipe = useAiRecipe(id);

  if (recipe === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-hidden="true">
        <div className="skeleton-warm h-48" />
        <div className="skeleton-warm h-10 w-2/3" />
        <div className="skeleton-warm h-40" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <EmptyState
        emoji="🔎"
        title="الوصفة غير موجودة"
        action={
          <Link href="/my-recipes" className="btn btn-primary rounded-full">
            إلى وصفاتي
          </Link>
        }
      >
        ربما حُذفت هذه الوصفة أو أن الرابط غير صحيح.
      </EmptyState>
    );
  }

  return <RecipeDetail recipe={recipe} />;
}

export default function AiRecipePage() {
  return (
    <Suspense fallback={<div className="skeleton-warm h-48" aria-hidden="true" />}>
      <AiRecipeView />
    </Suspense>
  );
}
