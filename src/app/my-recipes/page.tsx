"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RecipeCardSkeleton } from "@/components/recipes/recipe-card";
import { RecipeList } from "@/components/recipes/recipe-list";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useFavoriteIds } from "@/lib/db/hooks";
import { useSelectedDay } from "@/lib/kitchen/ui-state";
import { useKitchen, useMatches } from "@/lib/kitchen/use-kitchen";

/** Saved AI recipes ("وصفاتي"). They take part in matching like built-in ones. */
export default function MyRecipesPage() {
  const kitchen = useKitchen();
  const [day] = useSelectedDay();
  const favoriteIds = useFavoriteIds();
  const results = useMatches(kitchen, day);

  // Newest first, like the list of saved recipes itself.
  const mine = useMemo(() => {
    if (!kitchen || !results) return undefined;
    const order = new Map(kitchen.aiRecipes.map((recipe, index) => [recipe.id, index]));
    return results
      .filter((result) => result.recipe.source === "ai")
      .sort((a, b) => (order.get(a.recipe.id) ?? 0) - (order.get(b.recipe.id) ?? 0));
  }, [kitchen, results]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="وصفاتي" subtitle="وصفات حفظتها من اقتراحات المساعد" back="/recipes" />

      {!kitchen || !mine ? (
        <div className="flex flex-col gap-2.5">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      ) : mine.length === 0 ? (
        <EmptyState
          emoji="✨"
          title="لا وصفات محفوظة بعد"
          action={
            <Link href="/" className="btn btn-primary rounded-full">
              إلى الاقتراحات
            </Link>
          }
        >
          من صفحة الاقتراحات اضغط «اقترح لي أفكاراً جديدة»، ثم احفظ ما يعجبك ليظهر هنا ويدخل في المطابقة.
        </EmptyState>
      ) : (
        <RecipeList results={mine} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={20} />
      )}
    </div>
  );
}
