"use client";

import { ChevronLeft, DatabaseBackup, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AiAssistant } from "@/components/ai/ai-assistant";
import { OnlineBadge } from "@/components/layout/online-badge";
import { MEAL_TINTS, RecipeCardSkeleton, recipeHref } from "@/components/recipes/recipe-card";
import { hasActiveFilters, RecipeFilters } from "@/components/recipes/recipe-filters";
import { RecipeList } from "@/components/recipes/recipe-list";
import { Logo } from "@/components/ui/brand";
import { Emoji } from "@/components/ui/emoji";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { useDayPlan, useFavoriteIds } from "@/lib/db/hooks";
import { clearPlan, dateKey } from "@/lib/db/repositories/dayPlan";
import { setSetting } from "@/lib/db/repositories/settings";
import { formatCount, ITEM_FORMS } from "@/lib/format";
import { EMPTY_FILTERS, mealChipsToTypes, useHomeFilters, useSelectedDay, useVisitSeed } from "@/lib/kitchen/ui-state";
import { useKitchen, useMatches, type Kitchen } from "@/lib/kitchen/use-kitchen";
import { arrangeForDay } from "@/lib/matching/arrange";
import { toSections, type Day, type MatchSections } from "@/lib/matching/matchRecipes";

const BACKUP_REMINDER_MS = 30 * 24 * 60 * 60 * 1000;
const BACKUP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export default function HomePage() {
  const kitchen = useKitchen();
  const [day, setDay] = useSelectedDay();
  const [filters, setFilters] = useHomeFilters();
  const visitSeed = useVisitSeed();
  const favoriteIds = useFavoriteIds();
  const [showUnsuitable, setShowUnsuitable] = useState(false);
  const [showShopping, setShowShopping] = useState(false);

  const matchFilters = useMemo(
    () => ({
      course: filters.course,
      time: filters.time,
      difficulty: filters.difficulty,
      mealType: mealChipsToTypes(filters.meal),
    }),
    [filters],
  );
  const results = useMatches(kitchen, day, matchFilters);
  // Inside every section: main dishes, then appetizers, then desserts, each in
  // an order that changes with every visit.
  const sections = useMemo(() => {
    if (!results) return undefined;
    const split = toSections(results);
    const seed = `${day}|${visitSeed}`;
    const arranged = {} as MatchSections;
    for (const name of Object.keys(split) as Array<keyof MatchSections>) arranged[name] = arrangeForDay(split[name], seed);
    return arranged;
  }, [results, day, visitSeed]);

  const filtered = hasActiveFilters(filters);
  const nothingToCook = sections ? sections.ready.length + sections.almost.length + sections.prepTonight.length === 0 : false;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <OnlineBadge />
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl leading-tight">{day === "today" ? "شو نطبخ اليوم؟" : "شو نطبخ بكرا؟"}</h1>
        <p className="text-sm text-base-content/65">
          {kitchen
            ? kitchen.freshCount > 0
              ? `اقتراحات مما عندك: ${formatCount(kitchen.freshCount, ITEM_FORMS)} طازجة + ${kitchen.stapleIds.size} من الأساسيات`
              : "اقتراحات من الأساسيات فقط — أضف ما اشتريته لتتحسن"
            : "نحضّر الاقتراحات…"}
        </p>
      </div>

      <Segmented<Day>
        label="اليوم أو غداً"
        value={day}
        onChange={setDay}
        options={[
          { value: "today", label: <><Emoji>☀️</Emoji> اليوم</> },
          { value: "tomorrow", label: <><Emoji>🌙</Emoji> غداً</> },
        ]}
      />

      {kitchen && <PinnedPlan kitchen={kitchen} day={day} />}
      {kitchen && <BackupReminder kitchen={kitchen} />}
      {kitchen && <PantryPrompt empty={kitchen.freshCount === 0} />}

      <RecipeFilters compact value={filters} onChange={setFilters} />

      {!kitchen || !sections ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <RecipeCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div key={`${day}`} className="flex flex-col gap-7">
          {sections.ready.length > 0 && (
            <Section title="جاهزة الآن" emoji="✅" count={sections.ready.length} hint="كل مكوناتها الأساسية عندك">
              <RecipeList results={sections.ready} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={8} />
            </Section>
          )}

          {sections.almost.length > 0 && (
            <Section title="ينقصها شيء بسيط" emoji="🛒" count={sections.almost.length} hint="مكوّن أو اثنان فقط">
              <RecipeList results={sections.almost} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={5} />
            </Section>
          )}

          {day === "today" && sections.prepTonight.length > 0 && (
            <Section
              title="جهّزها الليلة للغد"
              emoji="🌙"
              count={sections.prepTonight.length}
              hint="تحتاج نقعاً أو تتبيلاً أو تخميراً مسبقاً"
            >
              <RecipeList results={sections.prepTonight} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={4} />
            </Section>
          )}

          {nothingToCook && (
            <EmptyState
              emoji={filtered ? "🔍" : "🧺"}
              title={filtered ? "لا وصفات بهذه الفلاتر" : "لا شيء جاهز بعد"}
              action={
                filtered ? (
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="btn btn-primary rounded-full"
                  >
                    امسح الفلاتر
                  </button>
                ) : (
                  <Link href="/pantry" className="btn btn-primary rounded-full">
                    حدّث مطبخي
                  </Link>
                )
              }
            >
              {filtered
                ? "جرّب إزالة بعض الفلاتر، أو انظر في قسم «تحتاج تسوّق» بالأسفل."
                : "أضف المكونات المتوفرة عندك في «مطبخي» لتظهر الوصفات التي تستطيع طبخها."}
            </EmptyState>
          )}

          {sections.shopping.length > 0 && (
            <section className="flex flex-col gap-3">
              <button
                type="button"
                aria-expanded={showShopping}
                onClick={() => setShowShopping((value) => !value)}
                className="surface pressable flex min-h-14 items-center justify-between gap-3 px-4 text-start"
              >
                <span className="flex items-center gap-2 font-bold">
                  <Emoji>🧾</Emoji>
                  تحتاج تسوّق
                  <span className="rounded-full bg-base-content/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-base-content/65">
                    {sections.shopping.length}
                  </span>
                </span>
                <ChevronLeft className={`size-5 transition-transform duration-300 ${showShopping ? "-rotate-90" : ""}`} />
              </button>
              {showShopping && (
                <RecipeList results={sections.shopping} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={6} />
              )}
            </section>
          )}

          {sections.unsuitable.length > 0 && (
            <section className="flex flex-col gap-3">
              <button
                type="button"
                aria-expanded={showUnsuitable}
                onClick={() => setShowUnsuitable((value) => !value)}
                className="min-h-11 self-center text-sm font-medium text-base-content/65 underline-offset-4 hover:underline"
              >
                {showUnsuitable ? "أخفِ" : "أظهر"} المستبعدة لنقص الأدوات ({sections.unsuitable.length})
              </button>
              {showUnsuitable && (
                <RecipeList results={sections.unsuitable} resolveRef={kitchen.resolveRef} favoriteIds={favoriteIds} initial={6} />
              )}
            </section>
          )}

          <AiAssistant kitchen={kitchen} matches={results ?? []} />
        </div>
      )}
    </div>
  );
}

/**
 * Always on the home page: the way to «مطبخي». Suggestions are only as good as
 * the pantry, so the user is reminded to add what they bought (and remove what
 * ran out) before looking at the list.
 */
function PantryPrompt({ empty }: { empty: boolean }) {
  return (
    <Link href="/pantry" className="pressable flex items-center gap-3 rounded-3xl bg-accent/30 p-3 ps-4">
      <Emoji className={`text-3xl ${empty ? "animate-float" : ""}`}>🛒</Emoji>
      <span className="min-w-0 flex-1 text-sm leading-snug">
        <b className="block">{empty ? "ماذا في البراد اليوم؟" : "اشتريت شيئاً أو نفد شيء؟"}</b>
        <span className="text-base-content/70">
          {empty ? "أضف اللحم والخضار لتظهر وصفات تستعملها." : "أضف الكوسا واللحم وما عندك الآن."}
        </span>
      </span>
      <span className="btn btn-primary btn-sm min-h-10 shrink-0 rounded-full">عدّل محتويات البراد</span>
    </Link>
  );
}

/** The recipe pinned for the selected day, if any. */
function PinnedPlan({ kitchen, day }: { kitchen: Kitchen; day: Day }) {
  const date = dateKey(day === "today" ? 0 : 1);
  const plan = useDayPlan(date);
  if (!plan) return null;
  const recipe = kitchen.recipes.find((item) => item.id === plan.recipeId);
  if (!recipe) return null;

  return (
    <div className="flex animate-pop items-stretch gap-2 rounded-3xl bg-primary p-2 text-primary-content shadow-lg shadow-primary/25">
      <Link href={recipeHref(recipe)} className="pressable flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1">
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-base-100 ${MEAL_TINTS[recipe.mealType]}`}>
          <Emoji className="text-3xl">{recipe.emoji ?? "🍽️"}</Emoji>
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium opacity-80">📌 {day === "today" ? "طبخة اليوم" : "طبخة الغد"}</span>
          <span className="block truncate text-lg font-bold">{recipe.name}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void clearPlan(date)}
        aria-label="ألغِ التثبيت"
        className="btn btn-circle btn-ghost size-11 self-center text-primary-content"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

/** Monthly nudge to export a backup (IndexedDB can be evicted by the browser). */
function BackupReminder({ kitchen }: { kitchen: Kitchen }) {
  const { lastBackupAt, installedAt, backupReminderSnoozedAt } = kitchen.settings;
  // Read the clock once per mount; the reminder does not need to tick.
  const [now] = useState(() => Date.now());
  const reference = Math.max(lastBackupAt, installedAt);
  const due = reference > 0 && now - reference > BACKUP_REMINDER_MS && now - backupReminderSnoozedAt > BACKUP_SNOOZE_MS;
  if (!due) return null;

  return (
    <div role="status" className="flex animate-rise items-center gap-3 rounded-3xl bg-info/14 p-3 ps-4">
      <DatabaseBackup className="size-6 shrink-0 text-info" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed">
        <b className="block">مرّ شهر بلا نسخة احتياطية</b>
        احفظ مطبخك ووصفاتك في ملف.
      </p>
      <Link href="/settings#backup" className="btn btn-sm min-h-11 rounded-full bg-base-100">
        انسخ الآن
      </Link>
      <button
        type="button"
        onClick={() => void setSetting("backupReminderSnoozedAt", Date.now())}
        aria-label="ذكّرني لاحقاً"
        className="btn btn-circle btn-ghost size-11"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
