"use client";

import { Heart, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { RecipeCardSkeleton } from "@/components/recipes/recipe-card";
import { CuisineFilters, RecipeFilters } from "@/components/recipes/recipe-filters";
import { RecipeList } from "@/components/recipes/recipe-list";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useFavoriteIds } from "@/lib/db/hooks";
import { mealChipsToTypes, useBrowseFilters, useSelectedDay } from "@/lib/kitchen/ui-state";
import { useKitchen, useMatches } from "@/lib/kitchen/use-kitchen";
import type { Recipe } from "@/lib/schemas/recipe";
import { matchesQuery } from "@/lib/text/arabic";

function searchText(recipe: Recipe): string {
  return [recipe.name, recipe.nameEn ?? "", recipe.description, ...(recipe.tags ?? [])].join(" ");
}

export default function RecipesPage() {
  const kitchen = useKitchen();
  const [day] = useSelectedDay();
  const [filters, setFilters] = useBrowseFilters();
  const favoriteIds = useFavoriteIds();

  const matchFilters = useMemo(
    () => ({
      time: filters.time,
      difficulty: filters.difficulty,
      mealType: mealChipsToTypes(filters.meal),
      cuisine: filters.cuisine,
    }),
    [filters.time, filters.difficulty, filters.meal, filters.cuisine],
  );
  const results = useMatches(kitchen, day, matchFilters);

  const query = filters.query.trim();
  const visible = useMemo(() => {
    if (!results) return undefined;
    return results.filter((result) => {
      if (!filters.showUnsuitable && result.status === "unsuitable") return false;
      if (filters.favoritesOnly && !favoriteIds?.has(result.recipe.id)) return false;
      if (query && !matchesQuery(searchText(result.recipe), query)) return false;
      return true;
    });
  }, [results, filters.showUnsuitable, filters.favoritesOnly, favoriteIds, query]);

  const hiddenUnsuitable = results && !filters.showUnsuitable ? results.filter((r) => r.status === "unsuitable").length : 0;
  const anyFilter =
    query !== "" ||
    filters.favoritesOnly ||
    filters.time.length + filters.difficulty.length + filters.meal.length + filters.cuisine.length > 0;

  const reset = () =>
    setFilters({ time: [], difficulty: [], meal: [], cuisine: [], favoritesOnly: false, showUnsuitable: filters.showUnsuitable, query: "" });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="وصفات"
        subtitle={visible ? `${visible.length} وصفة` : "…"}
        action={
          <Link href="/my-recipes" className="btn min-h-11 rounded-full bg-base-100">
            <Sparkles className="size-4" />
            وصفاتي
          </Link>
        }
      />

      <label className="input input-lg w-full rounded-full bg-base-100">
        <Search className="size-5 opacity-50" />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          placeholder="ابحث: كبة، معكرونة، شوربة…"
          aria-label="ابحث عن وصفة"
          enterKeyHint="search"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => setFilters({ ...filters, query: "" })}
            aria-label="امسح البحث"
            className="grid size-8 place-items-center rounded-full"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="flex flex-col gap-1">
        <CuisineFilters value={filters.cuisine} onChange={(cuisine) => setFilters({ ...filters, cuisine })} />
        <RecipeFilters value={filters} onChange={setFilters} />
        <div className="scroll-row -mx-4 px-4 py-1">
          <Chip
            active={filters.favoritesOnly}
            onToggle={() => setFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
            count={favoriteIds?.size || undefined}
          >
            <Heart className={`size-4 ${filters.favoritesOnly ? "fill-current" : ""}`} />
            المفضلة
          </Chip>
          <Chip
            active={filters.showUnsuitable}
            onToggle={() => setFilters({ ...filters, showUnsuitable: !filters.showUnsuitable })}
            count={hiddenUnsuitable || undefined}
          >
            أظهر ما ينقصه أدوات
          </Chip>
        </div>
      </div>

      {!kitchen || !visible ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          emoji={filters.favoritesOnly && !query ? "🤍" : "🔍"}
          title={filters.favoritesOnly && !query ? "لا مفضلة بعد" : "لا وصفات مطابقة"}
          action={
            anyFilter ? (
              <button type="button" onClick={reset} className="btn btn-primary rounded-full">
                امسح الفلاتر
              </button>
            ) : undefined
          }
        >
          {filters.favoritesOnly && !query
            ? "افتح أي وصفة واضغط على القلب لتجدها هنا."
            : "جرّب كلمة أخرى أو خفّف الفلاتر."}
        </EmptyState>
      ) : (
        <RecipeList
          // Remount when the filters change so the list starts from the top again.
          key={JSON.stringify([matchFilters, filters.favoritesOnly, filters.showUnsuitable, query])}
          results={visible}
          resolveRef={kitchen.resolveRef}
          favoriteIds={favoriteIds}
          initial={14}
          step={20}
        />
      )}
    </div>
  );
}
