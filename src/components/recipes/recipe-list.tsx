"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { Emoji } from "@/components/ui/emoji";
import type { RefResolver } from "@/lib/kitchen/names";
import { courseLabels } from "@/lib/labels";
import type { MatchResult } from "@/lib/matching/matchRecipes";
import { courseOf } from "@/lib/schemas/recipe";
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

/**
 * A column of recipe cards that grows on demand, so long lists stay light.
 * When the list holds more than one course (it comes grouped: main dishes,
 * appetizers, desserts), a small heading opens each group.
 */
export function RecipeList({ results, resolveRef, favoriteIds, initial = 6, step = 12 }: RecipeListProps) {
  const [limit, setLimit] = useState(initial);
  const visible = results.slice(0, limit);
  const remaining = results.length - visible.length;
  const mixedCourses = results.some((result) => courseOf(result.recipe) !== courseOf(results[0].recipe));

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((result, index) => {
        const course = courseOf(result.recipe);
        const opensGroup = mixedCourses && (index === 0 || courseOf(visible[index - 1].recipe) !== course);
        return (
          <Fragment key={result.recipe.id}>
            {opensGroup && (
              <h3 className={`flex items-center gap-1.5 px-1 text-sm font-bold text-base-content/65 ${index > 0 ? "mt-2" : ""}`}>
                <Emoji>{courseLabels[course].emoji}</Emoji>
                {courseLabels[course].label}
              </h3>
            )}
            <RecipeCard
              result={result}
              resolveRef={resolveRef}
              favorite={favoriteIds?.has(result.recipe.id)}
              index={index < initial ? index : index - (limit - step)}
            />
          </Fragment>
        );
      })}
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
