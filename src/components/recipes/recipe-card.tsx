import { Clock, Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { Emoji } from "@/components/ui/emoji";
import { formatAdvancePrep, formatMinutes } from "@/lib/format";
import type { RefResolver } from "@/lib/kitchen/names";
import { advancePrepLabels, capabilityLabels, difficultyLabels } from "@/lib/labels";
import type { MatchResult } from "@/lib/matching/matchRecipes";
import { totalMinutes } from "@/lib/matching/timeBucket";
import type { MealType, Recipe } from "@/lib/schemas/recipe";
import { EquipmentIcons } from "./equipment-badges";

/** Tile tint behind the recipe emoji, by meal type. */
export const MEAL_TINTS: Record<MealType, string> = {
  meat: "bg-primary/14",
  chicken: "bg-accent/35",
  fish: "bg-info/16",
  vegetarian: "bg-warning/22",
  vegan: "bg-success/18",
};

export function recipeHref(recipe: Pick<Recipe, "id" | "source">): string {
  return recipe.source === "ai" ? `/my-recipes/view?id=${encodeURIComponent(recipe.id)}` : `/recipes/${recipe.id}`;
}

const MAX_MISSING_SHOWN = 3;

interface RecipeCardProps {
  result: MatchResult;
  resolveRef: RefResolver;
  favorite?: boolean;
  /** Position in the list, for the staggered entry animation. */
  index?: number;
}

export function RecipeCard({ result, resolveRef, favorite = false, index = 0 }: RecipeCardProps) {
  const { recipe, status, missing, viaSubstitute, missingEquipment } = result;
  const missingNames = missing.slice(0, MAX_MISSING_SHOWN).map((ref) => resolveRef(ref).name);
  const moreMissing = missing.length - missingNames.length;

  return (
    <Link
      href={recipeHref(recipe)}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className="surface pressable group flex animate-rise items-stretch gap-3 p-3 hover:border-primary/30"
    >
      <span
        className={`relative grid w-[4.75rem] shrink-0 place-items-center self-stretch rounded-[1.1rem] ${MEAL_TINTS[recipe.mealType]}`}
      >
        <Emoji className="text-[2.5rem] transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:-rotate-6">
          {recipe.emoji ?? "🍽️"}
        </Emoji>
        {status === "ready" && (
          <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-success text-[0.65rem] font-bold text-success-content shadow-sm">
            ✓
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-base leading-snug font-bold">{recipe.name}</span>
          <span className="flex shrink-0 items-center gap-1 pt-0.5">
            {recipe.source === "ai" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/35 px-1.5 py-0.5 text-[0.65rem] font-bold">
                <Sparkles className="size-3" />
                AI
              </span>
            )}
            {favorite && <Heart className="size-4 fill-primary text-primary" aria-label="في المفضلة" />}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-base-content/65">
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <Clock className="size-3.5" />
            {formatMinutes(totalMinutes(recipe))}
          </span>
          <span>{difficultyLabels[recipe.difficulty]}</span>
          <EquipmentIcons equipment={recipe.equipment} missing={missingEquipment} />
        </span>

        {(missingEquipment.length > 0 ||
          missing.length > 0 ||
          viaSubstitute.length > 0 ||
          (result.needsAdvancePrep && recipe.advancePrep)) && (
          <span className="flex flex-wrap gap-1.5">
            {missingEquipment.length > 0 && (
              <span className="rounded-full bg-error/12 px-2 py-0.5 text-xs font-semibold text-error">
                يحتاج {missingEquipment.map((cap) => capabilityLabels[cap]).join("، ")}
              </span>
            )}
            {missing.length > 0 && (
              <span className="rounded-full bg-error/12 px-2 py-0.5 text-xs font-semibold text-error">
                ينقص: {missingNames.join("، ")}
                {moreMissing > 0 && ` +${moreMissing}`}
              </span>
            )}
            {viaSubstitute.map((substitute) => (
              <span key={substitute.ref} className="rounded-full bg-warning/25 px-2 py-0.5 text-xs font-semibold">
                {resolveRef(substitute.ingredientId).name} بدل {resolveRef(substitute.ref).name}
              </span>
            ))}
            {result.needsAdvancePrep && recipe.advancePrep && (
              <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs font-semibold">
                <Emoji>{advancePrepLabels[recipe.advancePrep.kind].emoji}</Emoji>{" "}
                {formatAdvancePrep(recipe.advancePrep, advancePrepLabels[recipe.advancePrep.kind].label)}
              </span>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Loading placeholder with the same footprint as a card. */
export function RecipeCardSkeleton() {
  return <div className="skeleton-warm h-[6.5rem]" aria-hidden="true" />;
}
