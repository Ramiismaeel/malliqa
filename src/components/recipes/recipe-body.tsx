import { Check, Clock, Flame, Gauge, Minus, Replace, Sparkles, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import { Emoji } from "@/components/ui/emoji";
import { formatAdvancePrep, formatAmount, formatMinutes, formatServings } from "@/lib/format";
import type { RefResolver } from "@/lib/kitchen/names";
import {
  advancePrepLabels,
  capabilityLabels,
  courseLabels,
  cuisineLabels,
  difficultyLabels,
  mealTypeLabels,
  timeBucketLabels,
} from "@/lib/labels";
import type { MatchResult } from "@/lib/matching/matchRecipes";
import type { Capability } from "@/lib/schemas/equipment";
import { courseOf, CUSTOM_PREFIX, type Recipe, type RecipeIngredient } from "@/lib/schemas/recipe";
import { EquipmentBadges } from "./equipment-badges";

type IngredientState = "have" | "via-group" | "via-substitute" | "missing" | "optional-missing" | "unknown";

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-base-100 px-2 py-3 text-center">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span className="text-[0.7rem] text-base-content/65">{label}</span>
    </div>
  );
}

const STATE_STYLES: Record<IngredientState, { box: string; icon: ReactNode; label: string }> = {
  have: { box: "bg-success/18 text-success", icon: <Check className="size-4" strokeWidth={3} />, label: "متوفر" },
  "via-group": { box: "bg-success/18 text-success", icon: <Check className="size-4" strokeWidth={3} />, label: "متوفر" },
  "via-substitute": { box: "bg-warning/30 text-warning-content", icon: <Replace className="size-4" />, label: "متوفر ببديل" },
  missing: { box: "bg-error/14 text-error", icon: <X className="size-4" strokeWidth={3} />, label: "ناقص" },
  "optional-missing": { box: "bg-base-content/8 text-base-content/65", icon: <Minus className="size-4" />, label: "غير متوفر (اختياري)" },
  unknown: { box: "bg-base-content/8 text-base-content/65", icon: <span className="size-1.5 rounded-full bg-current" />, label: "" },
};

interface RecipeBodyProps {
  recipe: Recipe;
  /** Pantry match; when absent the ingredient list shows no ✓/✗ state. */
  match?: MatchResult;
  resolveRef: RefResolver;
  capabilities?: ReadonlySet<Capability>;
}

/**
 * The readable part of a recipe: stats, status, ingredients checked against
 * the pantry, equipment and steps. Shared by the recipe page and the AI preview.
 */
export function RecipeBody({ recipe, match, resolveRef, capabilities }: RecipeBodyProps) {
  const viaGroup = new Map(match?.viaGroup.map((item) => [item.ref, item.ingredientId]));
  const viaSubstitute = new Map(match?.viaSubstitute.map((item) => [item.ref, item]));
  const missing = new Set([...(match?.missing ?? []), ...(match?.optionalMissing ?? [])]);

  const stateOf = (ingredient: RecipeIngredient): IngredientState => {
    if (!match) return "unknown";
    if (viaSubstitute.has(ingredient.ref)) return "via-substitute";
    if (missing.has(ingredient.ref)) return ingredient.role === "optional" ? "optional-missing" : "missing";
    return viaGroup.has(ingredient.ref) ? "via-group" : "have";
  };

  const required = recipe.ingredients.filter((ingredient) => ingredient.role === "required");
  const optional = recipe.ingredients.filter((ingredient) => ingredient.role === "optional");

  const renderIngredient = (ingredient: RecipeIngredient) => {
    const state = stateOf(ingredient);
    const style = STATE_STYLES[state];
    const info = resolveRef(ingredient.ref);
    const amount = formatAmount(ingredient);
    const substitute = viaSubstitute.get(ingredient.ref);
    const groupMember = viaGroup.get(ingredient.ref);
    const isFreeText = ingredient.ref.startsWith(CUSTOM_PREFIX);

    let detail: string | undefined;
    if (substitute) {
      detail = `استعمل ${resolveRef(substitute.ingredientId).name}${substitute.note ? ` — ${substitute.note}` : ""}`;
    } else if (groupMember && resolveRef(groupMember).name !== info.name) {
      detail = `عندك: ${resolveRef(groupMember).name}`;
    } else if (state === "missing" && info.hint) {
      detail = `أي من: ${info.hint}`;
    } else if (isFreeText && (state === "missing" || state === "optional-missing")) {
      detail = "ليس في قائمة المكونات — أضفه من «مطبخي» إن كان عندك";
    }

    return (
      <li key={ingredient.ref} className="flex items-start gap-3 py-2.5">
        <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${style.box}`}>
          {style.icon}
          {style.label && <span className="sr-only">{style.label}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`font-semibold ${state === "optional-missing" ? "text-base-content/65" : ""}`}>
              {info.name}
            </span>
            {ingredient.note && <span className="text-sm text-base-content/65">{ingredient.note}</span>}
          </span>
          {detail && <span className="block text-xs leading-relaxed text-base-content/65">{detail}</span>}
        </span>
        {amount && <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-base-content/70">{amount}</span>}
      </li>
    );
  };

  const prep = recipe.advancePrep;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-2">
        <Stat icon={<Clock className="size-5" />} label="تحضير" value={formatMinutes(recipe.prepMinutes)} />
        <Stat icon={<Flame className="size-5" />} label="طبخ" value={formatMinutes(recipe.cookMinutes)} />
        <Stat icon={<Users className="size-5" />} label="تكفي" value={formatServings(recipe.servings)} />
        <Stat icon={<Gauge className="size-5" />} label="الصعوبة" value={difficultyLabels[recipe.difficulty]} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="badge badge-lg gap-1 rounded-full border-none bg-base-100">
          <Emoji>{courseLabels[courseOf(recipe)].emoji}</Emoji>
          {courseLabels[courseOf(recipe)].label}
        </span>
        <span className="badge badge-lg gap-1 rounded-full border-none bg-base-100">
          <Emoji>{cuisineLabels[recipe.cuisine].emoji}</Emoji>
          {cuisineLabels[recipe.cuisine].label}
        </span>
        <span className="badge badge-lg gap-1 rounded-full border-none bg-base-100">
          <Emoji>{mealTypeLabels[recipe.mealType].emoji}</Emoji>
          {mealTypeLabels[recipe.mealType].label}
        </span>
        {match && (
          <span className="badge badge-lg rounded-full border-none bg-base-100">{timeBucketLabels[match.timeBucket].label}</span>
        )}
        {recipe.source === "ai" && (
          <span className="badge badge-lg gap-1 rounded-full border-none bg-accent/35">
            <Sparkles className="size-3.5" />
            من اقتراح AI
          </span>
        )}
        {recipe.tags?.map((tag) => (
          <span key={tag} className="badge badge-lg rounded-full border-none bg-base-content/6 text-base-content/70">
            {tag}
          </span>
        ))}
      </div>

      {prep && (
        <div className="flex items-start gap-3 rounded-3xl bg-info/14 p-4">
          <Emoji className="text-2xl">{advancePrepLabels[prep.kind].emoji}</Emoji>
          <div className="text-sm leading-relaxed">
            <p className="font-bold">تحتاج تحضيراً مسبقاً: {formatAdvancePrep(prep, advancePrepLabels[prep.kind].label)}</p>
            {prep.note && <p className="text-base-content/70">{prep.note}</p>}
          </div>
        </div>
      )}

      {match && <StatusBanner match={match} resolveRef={resolveRef} />}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">المكونات</h2>
        <ul className="surface divide-y divide-base-content/6 px-4">{required.map(renderIngredient)}</ul>
        {optional.length > 0 && (
          <>
            <h3 className="mt-2 px-1 text-sm font-bold text-base-content/65">يمكن إضافة</h3>
            <ul className="surface divide-y divide-base-content/6 px-4">{optional.map(renderIngredient)}</ul>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">الأدوات</h2>
        <EquipmentBadges equipment={recipe.equipment} capabilities={capabilities} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">طريقة التحضير</h2>
        <ol className="flex flex-col gap-2">
          {recipe.steps.map((step, index) => (
            <li key={index} className="surface flex gap-3 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-primary-content">
                {index + 1}
              </span>
              <p className="pt-0.5 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function StatusBanner({ match, resolveRef }: { match: MatchResult; resolveRef: RefResolver }) {
  if (match.missingEquipment.length > 0) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-3xl bg-error/12 p-4 text-sm leading-relaxed">
        <Emoji className="text-2xl">🚫</Emoji>
        <p>
          <span className="font-bold">غير مناسبة لأدواتك الحالية.</span> تحتاج:{" "}
          {match.missingEquipment.map((cap) => capabilityLabels[cap]).join("، ")}.
        </p>
      </div>
    );
  }
  if (match.missing.length === 0) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-3xl bg-success/16 p-4 text-sm">
        <Emoji className="animate-wiggle text-2xl">✅</Emoji>
        <p className="font-bold">
          جاهزة الآن — كل المكونات الأساسية عندك
          {match.viaSubstitute.length > 0 && <span className="font-normal"> (مع بديل)</span>}.
        </p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-start gap-3 rounded-3xl bg-warning/22 p-4 text-sm leading-relaxed">
      <Emoji className="text-2xl">🛒</Emoji>
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {match.missing.length === 1 ? "ينقصك مكوّن واحد" : `ينقصك ${match.missing.length} مكونات`}
        </p>
        <p className="text-base-content/75">{match.missing.map((ref) => resolveRef(ref).name).join("، ")}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base-content/10" aria-hidden="true">
          <div className="h-full rounded-full bg-warning transition-[width] duration-700 ease-out-soft" style={{ width: `${match.matchPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
