"use client";

import { CalendarCheck, CalendarPlus, ChevronRight, Heart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Emoji } from "@/components/ui/emoji";
import { useToast } from "@/components/ui/toast";
import { useDayPlan, useFavoriteIds } from "@/lib/db/hooks";
import { deleteAiRecipe } from "@/lib/db/repositories/aiRecipes";
import { clearPlan, dateKey, setPlan } from "@/lib/db/repositories/dayPlan";
import { toggleFavorite } from "@/lib/db/repositories/favorites";
import { createRefResolver } from "@/lib/kitchen/names";
import { useKitchen, useRecipeMatch } from "@/lib/kitchen/use-kitchen";
import type { Recipe } from "@/lib/schemas/recipe";
import { RecipeBody } from "./recipe-body";
import { MEAL_TINTS } from "./recipe-card";

const fallbackResolver = createRefResolver();

interface RecipeDetailProps {
  recipe: Recipe;
}

/** Full recipe page: hero, favorite, pin to today/tomorrow, and the body. */
export function RecipeDetail({ recipe }: RecipeDetailProps) {
  const router = useRouter();
  const toast = useToast();
  const kitchen = useKitchen();
  // "tomorrow" so advance prep never changes the status shown on this page.
  const match = useRecipeMatch(kitchen, recipe, "tomorrow");
  const favoriteIds = useFavoriteIds();
  const todayKey = dateKey(0);
  const tomorrowKey = dateKey(1);
  const todayPlan = useDayPlan(todayKey);
  const tomorrowPlan = useDayPlan(tomorrowKey);
  const [heartKey, setHeartKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isFavorite = favoriteIds?.has(recipe.id) ?? false;
  const pinnedToday = todayPlan?.recipeId === recipe.id;
  const pinnedTomorrow = tomorrowPlan?.recipeId === recipe.id;

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(recipe.source === "ai" ? "/my-recipes" : "/recipes");
  };

  const onFavorite = async () => {
    const added = await toggleFavorite(recipe.id);
    setHeartKey((key) => key + 1);
    toast(added ? "أُضيفت إلى المفضلة" : "أُزيلت من المفضلة", { emoji: added ? "❤️" : "🤍" });
  };

  const onPin = async (date: string, pinned: boolean, label: string) => {
    if (pinned) {
      await clearPlan(date);
      toast(`أُلغي تثبيتها ${label}`, { emoji: "📌", tone: "info" });
    } else {
      await setPlan(date, recipe.id, recipe.source);
      toast(`ثُبّتت ${label}`, { emoji: "📌" });
    }
  };

  const onDelete = async () => {
    await deleteAiRecipe(recipe.id);
    toast("حُذفت الوصفة", { emoji: "🗑️", tone: "info" });
    router.replace("/my-recipes");
  };

  return (
    <article className="flex flex-col gap-5">
      <div className={`relative grid h-48 place-items-center overflow-hidden rounded-[2rem] ${MEAL_TINTS[recipe.mealType]}`}>
        <span aria-hidden="true" className="absolute -end-8 -top-10 size-40 rounded-full bg-base-100/35" />
        <span aria-hidden="true" className="absolute -start-6 -bottom-12 size-32 rounded-full bg-base-100/25" />
        <Emoji className="animate-float text-[5.5rem] drop-shadow-lg">{recipe.emoji ?? "🍽️"}</Emoji>

        <button
          type="button"
          onClick={goBack}
          aria-label="رجوع"
          className="btn btn-circle absolute start-3 top-3 size-11 border-none bg-base-100/85 shadow-sm backdrop-blur"
        >
          <ChevronRight className="size-6" />
        </button>
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "أزل من المفضلة" : "أضف إلى المفضلة"}
          className="btn btn-circle absolute end-3 top-3 size-11 border-none bg-base-100/85 shadow-sm backdrop-blur"
        >
          <Heart
            key={heartKey}
            className={`size-6 ${heartKey > 0 ? "animate-heart" : ""} ${isFavorite ? "fill-primary text-primary" : "text-base-content/70"}`}
          />
        </button>
      </div>

      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl leading-tight">{recipe.name}</h1>
        {recipe.nameEn && (
          <p dir="ltr" className="text-end text-sm text-base-content/50">
            {recipe.nameEn}
          </p>
        )}
        <p className="leading-relaxed text-base-content/75">{recipe.description}</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={pinnedToday}
          onClick={() => onPin(todayKey, pinnedToday, "لليوم")}
          className={`btn btn-lg rounded-full ${pinnedToday ? "btn-primary" : "bg-base-100"}`}
        >
          {pinnedToday ? <CalendarCheck className="size-5" /> : <CalendarPlus className="size-5" />}
          {pinnedToday ? "طبخة اليوم" : "ثبّت لليوم"}
        </button>
        <button
          type="button"
          aria-pressed={pinnedTomorrow}
          onClick={() => onPin(tomorrowKey, pinnedTomorrow, "للغد")}
          className={`btn btn-lg rounded-full ${pinnedTomorrow ? "btn-primary" : "bg-base-100"}`}
        >
          {pinnedTomorrow ? <CalendarCheck className="size-5" /> : <CalendarPlus className="size-5" />}
          {pinnedTomorrow ? "طبخة الغد" : "ثبّت للغد"}
        </button>
      </div>

      <RecipeBody
        recipe={recipe}
        match={match}
        resolveRef={kitchen?.resolveRef ?? fallbackResolver}
        capabilities={kitchen?.capabilities}
      />

      {recipe.source === "ai" && (
        <div className="mt-2 flex flex-col gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-3xl bg-error/10 p-3">
              <span className="flex-1 text-sm font-semibold">حذف هذه الوصفة نهائياً؟</span>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-ghost btn-sm min-h-11 rounded-full">
                إلغاء
              </button>
              <button type="button" onClick={onDelete} className="btn btn-error btn-sm min-h-11 rounded-full">
                احذف
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-ghost rounded-full text-error">
              <Trash2 className="size-5" />
              احذف من وصفاتي
            </button>
          )}
        </div>
      )}
    </article>
  );
}
