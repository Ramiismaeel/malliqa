"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { RefResolver } from "@/lib/kitchen/names";
import type { MatchResult } from "@/lib/matching/matchRecipes";
import { RecipeCard } from "./recipe-card";

interface RecipeListProps {
  results: MatchResult[];
  resolveRef: RefResolver;
  favoriteIds?: ReadonlySet<string>;
  /** Cards shown before "عرض المزيد". */
  initial?: number;
  /** Cards added per tap on "عرض المزيد". */
  step?: number;
}

/** A column of recipe cards that grows on demand, so long lists stay light. */
export function RecipeList({ results, resolveRef, favoriteIds, initial = 6, step = 12 }: RecipeListProps) {
  const [limit, setLimit] = useState(initial);
  const visible = results.slice(0, limit);
  const remaining = results.length - visible.length;

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((result, index) => (
        <RecipeCard
          key={result.recipe.id}
          result={result}
          resolveRef={resolveRef}
          favorite={favoriteIds?.has(result.recipe.id)}
          index={index < initial ? index : index - (limit - step)}
        />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + step)}
          className="btn btn-ghost min-h-11 rounded-full text-primary"
        >
          عرض المزيد ({remaining})
          <ChevronDown className="size-4" />
        </button>
      )}
    </div>
  );
}
