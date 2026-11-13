"use client";

import { ChevronDown, Heart, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RecipeCardSkeleton } from "@/components/recipes/recipe-card";
import { countActiveFilters, CuisineFilters, RecipeFilters } from "@/components/recipes/recipe-filters";
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
  const activeCount = countActiveFilters(filters);
  // The filter panel starts open when coming back to a filtered list.
  const [panelOpen, setPanelOpen] = useState(activeCount > 0);

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
            className="-me-3 grid size-11 shrink-0 place-items-center rounded-full"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="recipe-filter-panel"
            onClick={() => setPanelOpen((open) => !open)}
            className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
              activeCount > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-base-content/10 bg-base-100 text-base-content/80"
            }`}
          >
            <SlidersHorizontal className="size-4" />
            فلاتر
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-content tabular-nums">{activeCount}</span>
            )}
            <ChevronDown className={`size-4 transition-transform duration-300 ${panelOpen ? "rotate-180" : ""}`} />
          </button>
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

        {panelOpen && (
          <div id="recipe-filter-panel" className="surface flex animate-page flex-col gap-3 p-3">
            <CuisineFilters value={filters.cuisine} onChange={(cuisine) => setFilters({ ...filters, cuisine })} />
            <hr className="border-base-content/8" />
            <RecipeFilters value={filters} onChange={setFilters} />
          </div>
        )}
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
