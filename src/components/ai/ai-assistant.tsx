"use client";

import { BookmarkPlus, Check, ChevronRight, Clock, Sparkles, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { RecipeBody } from "@/components/recipes/recipe-body";
import { MEAL_TINTS } from "@/components/recipes/recipe-card";
import { BrandMark } from "@/components/ui/brand";
import { Emoji } from "@/components/ui/emoji";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { requestSuggestions } from "@/lib/ai/client";
import { saveAiRecipe } from "@/lib/db/repositories/aiRecipes";
import { formatMinutes } from "@/lib/format";
import { useOnline } from "@/lib/hooks/use-online";
import { useRecipeMatch, type Kitchen } from "@/lib/kitchen/use-kitchen";
import { cuisineLabels, difficultyLabels, mealTypeLabels, timeBucketLabels } from "@/lib/labels";
import type { MatchResult } from "@/lib/matching/matchRecipes";
import { totalMinutes, type TimeBucket } from "@/lib/matching/timeBucket";
import { AI_MAX_EXCLUDE, AI_MAX_INGREDIENTS, type AiSuggestRequest } from "@/lib/schemas/ai";
import { CUSTOM_PREFIX, type Cuisine, type MealType, type Recipe } from "@/lib/schemas/recipe";

type View =
  | { name: "form" }
  | { name: "loading" }
  | { name: "results"; recipes: Recipe[] }
  | { name: "detail"; recipes: Recipe[]; recipe: Recipe }
  | { name: "error"; message: string };

const TIME_OPTIONS: TimeBucket[] = ["quick", "medium", "long"];
const CUISINE_OPTIONS: Cuisine[] = ["syrian", "levantine", "arab", "italian", "asian", "quick"];
const MEAL_OPTIONS: MealType[] = ["meat", "chicken", "fish", "vegetarian", "vegan"];
const COUNT_OPTIONS = [3, 4, 5];

interface AiAssistantProps {
  kitchen: Kitchen;
  /** Current home results: ready/almost names are sent so the AI does not repeat them. */
  matches: MatchResult[];
}

/** "اقترح لي أفكاراً جديدة": button + sheet (filters → results → review → save). */
export function AiAssistant({ kitchen, matches }: AiAssistantProps) {
  const online = useOnline();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="surface relative flex flex-col gap-3 overflow-hidden p-4">
        <span aria-hidden="true" className="absolute -end-6 -top-8 size-28 rounded-full bg-accent/25" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/40">
            <Sparkles className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">تريد أفكاراً خارج القائمة؟</h2>
            <p className="text-sm text-base-content/65">المساعد يقترح وصفات جديدة مما عندك الآن.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!online}
          className="btn btn-neutral btn-lg relative rounded-full"
        >
          {online ? <Sparkles className="size-5" /> : <WifiOff className="size-5" />}
          اقترح لي أفكاراً جديدة
        </button>
        {!online && (
          <p role="status" className="relative text-center text-xs text-base-content/65">
            المساعد يحتاج إلى الإنترنت. كل شيء آخر يعمل بدونه.
          </p>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="مساعد ملّيقة">
        <AssistantFlow kitchen={kitchen} matches={matches} onClose={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
  allowNone = true,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  render: (option: T) => React.ReactNode;
  allowNone?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active && allowNone ? undefined : option)}
              className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${
                active ? "border-primary bg-primary text-primary-content" : "border-base-content/10 bg-base-200/60 text-base-content/75"
              }`}
            >
              {render(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function AssistantFlow({ kitchen, matches, onClose }: AiAssistantProps & { onClose: () => void }) {
  const toast = useToast();
  const [view, setView] = useState<View>({ name: "form" });
  const [timeBucket, setTimeBucket] = useState<TimeBucket>();
  const [cuisine, setCuisine] = useState<Cuisine>();
  const [mealType, setMealType] = useState<MealType>();
  const [count, setCount] = useState(3);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const lastPrompt = useRef("");

  // Names only: what is available now (fresh items first), never ids or rows.
  const ingredientNames = [...kitchen.pantryRows]
    .filter((row) => row.available)
    .sort((a, b) => Number(a.isStaple) - Number(b.isStaple))
    .map((row) => kitchen.resolveRef(row.ingredientId).name)
    .slice(0, AI_MAX_INGREDIENTS);

  const submit = async () => {
    const request: AiSuggestRequest = {
      ingredients: ingredientNames,
      equipment: [...kitchen.capabilities],
      ...(timeBucket ? { timeBucket } : {}),
      ...(cuisine ? { cuisine } : {}),
      ...(mealType ? { mealType } : {}),
      exclude: matches
        .filter((match) => match.status === "ready" || match.status === "almost")
        .slice(0, AI_MAX_EXCLUDE)
        .map((match) => match.recipe.name),
      count,
    };
    lastPrompt.current = [
      timeBucket && timeBucketLabels[timeBucket].label,
      cuisine && cuisineLabels[cuisine].label,
      mealType && mealTypeLabels[mealType].label,
    ]
      .filter(Boolean)
      .join(" · ");

    setView({ name: "loading" });
    const result = await requestSuggestions(request, { accessToken: kitchen.settings.aiAccessToken || undefined });
    setView(result.ok ? { name: "results", recipes: result.recipes } : { name: "error", message: result.message });
  };

  const save = async (recipe: Recipe) => {
    await saveAiRecipe(recipe, lastPrompt.current || undefined);
    setSavedIds((current) => new Set(current).add(recipe.id));
    toast("حُفظت في وصفاتي", { emoji: "📖" });
  };

  if (ingredientNames.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Emoji className="text-5xl">🧺</Emoji>
        <p className="font-bold">مطبخك فارغ</p>
        <p className="text-sm text-base-content/65">أضف ما عندك من مكونات أولاً ليقترح المساعد وصفات تناسبك.</p>
        <Link href="/pantry" onClick={onClose} className="btn btn-primary rounded-full">
          إلى مطبخي
        </Link>
      </div>
    );
  }

  if (view.name === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
        <span className="grid size-24 place-items-center rounded-[2rem] bg-primary text-primary-content shadow-xl shadow-primary/25">
          <BrandMark className="size-16 animate-stir" steaming />
        </span>
        <p className="text-lg font-bold">الشيف يفكّر…</p>
        <p className="max-w-xs text-sm text-base-content/65">يقلّب ما عندك من {ingredientNames.length} مادة ليخرج بأفكار جديدة.</p>
      </div>
    );
  }

  if (view.name === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
        <Emoji className="text-5xl">😕</Emoji>
        <p className="font-bold">لم ينجح الأمر</p>
        <p className="max-w-xs text-sm leading-relaxed text-base-content/70">{view.message}</p>
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={() => setView({ name: "form" })} className="btn btn-ghost rounded-full bg-base-200">
            تعديل الطلب
          </button>
          <button type="button" onClick={submit} className="btn btn-primary rounded-full">
            حاول مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  if (view.name === "detail") {
    return (
      <SuggestionDetail
        kitchen={kitchen}
        recipe={view.recipe}
        saved={savedIds.has(view.recipe.id)}
        onSave={() => save(view.recipe)}
        onBack={() => setView({ name: "results", recipes: view.recipes })}
      />
    );
  }

  if (view.name === "results") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-base-content/65">
          راجع الاقتراحات واحفظ ما يعجبك. لا يُحفظ شيء تلقائياً.
        </p>
        {view.recipes.map((recipe, index) => {
          const unknown = recipe.ingredients.filter((ingredient) => ingredient.ref.startsWith(CUSTOM_PREFIX)).length;
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => setView({ name: "detail", recipes: view.recipes, recipe })}
              style={{ animationDelay: `${index * 70}ms` }}
              className="pressable flex animate-rise items-stretch gap-3 rounded-3xl border border-base-content/8 bg-base-200/50 p-3 text-start"
            >
              <span className={`grid w-16 shrink-0 place-items-center rounded-2xl ${MEAL_TINTS[recipe.mealType]}`}>
                <Emoji className="text-4xl">{recipe.emoji ?? "🍽️"}</Emoji>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-bold leading-snug">{recipe.name}</span>
                  {savedIds.has(recipe.id) && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success/18 px-2 py-0.5 text-xs font-semibold text-success">
                      <Check className="size-3" strokeWidth={3} />
                      محفوظة
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 text-sm text-base-content/65">{recipe.description}</span>
                <span className="flex flex-wrap items-center gap-x-2.5 text-xs text-base-content/65">
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                    <Clock className="size-3.5" />
                    {formatMinutes(totalMinutes(recipe))}
                  </span>
                  <span>{difficultyLabels[recipe.difficulty]}</span>
                  {unknown > 0 && <span>✨ {unknown} خارج القائمة</span>}
                </span>
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => setView({ name: "form" })} className="btn btn-ghost mt-1 rounded-full">
          اقتراحات أخرى
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-base-content/70">
        سنرسل أسماء <b>{ingredientNames.length}</b> مادة متوفرة وأدواتك فقط. كل الخيارات اختيارية.
      </p>
      <OptionRow
        label="المدة"
        options={TIME_OPTIONS}
        value={timeBucket}
        onChange={setTimeBucket}
        render={(option) => timeBucketLabels[option].label}
      />
      <OptionRow
        label="المطبخ"
        options={CUISINE_OPTIONS}
        value={cuisine}
        onChange={setCuisine}
        render={(option) => (
          <>
            <Emoji>{cuisineLabels[option].emoji}</Emoji>
            {cuisineLabels[option].label}
          </>
        )}
      />
      <OptionRow
        label="النوع"
        options={MEAL_OPTIONS}
        value={mealType}
        onChange={setMealType}
        render={(option) => (
          <>
            <Emoji>{mealTypeLabels[option].emoji}</Emoji>
            {mealTypeLabels[option].label}
          </>
        )}
      />
      <OptionRow
        label="عدد الاقتراحات"
        options={COUNT_OPTIONS}
        value={count}
        onChange={(value) => setCount(value ?? 3)}
        render={(option) => option}
        allowNone={false}
      />
      <button type="button" onClick={submit} className="btn btn-primary btn-lg rounded-full">
        <Sparkles className="size-5" />
        اقترح لي
      </button>
    </div>
  );
}

function SuggestionDetail({
  kitchen,
  recipe,
  saved,
  onSave,
  onBack,
}: {
  kitchen: Kitchen;
  recipe: Recipe;
  saved: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  const match = useRecipeMatch(kitchen, recipe, "tomorrow");

  return (
    <div className="flex animate-page flex-col gap-4">
      <button type="button" onClick={onBack} className="btn btn-ghost btn-sm min-h-11 self-start rounded-full">
        <ChevronRight className="size-5" />
        كل الاقتراحات
      </button>
      <header className="flex items-center gap-3">
        <span className={`grid size-16 shrink-0 place-items-center rounded-2xl ${MEAL_TINTS[recipe.mealType]}`}>
          <Emoji className="text-4xl">{recipe.emoji ?? "🍽️"}</Emoji>
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-2xl leading-tight">{recipe.name}</h3>
          <p className="text-sm text-base-content/65">{recipe.description}</p>
        </div>
      </header>
      <button type="button" onClick={onSave} disabled={saved} className="btn btn-primary btn-lg rounded-full">
        {saved ? <Check className="size-5" /> : <BookmarkPlus className="size-5" />}
        {saved ? "محفوظة في وصفاتي" : "احفظ في وصفاتي"}
      </button>
      <RecipeBody recipe={recipe} match={match} resolveRef={kitchen.resolveRef} capabilities={kitchen.capabilities} />
    </div>
  );
}
