"use client";

import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EquipmentList } from "@/components/pantry/equipment-list";
import { IngredientToggle } from "@/components/pantry/ingredient-toggle";
import { Logo } from "@/components/ui/brand";
import { Chip } from "@/components/ui/chip";
import { Emoji } from "@/components/ui/emoji";
import { Splash } from "@/components/ui/splash";
import { ingredientCategories, ingredientCategoryById } from "@/data/categories";
import { defaultEquipmentIds, equipmentById } from "@/data/equipment";
import { defaultStapleIds, ingredients } from "@/data/ingredients";
import { useEquipmentRows, usePantryRows, useSettings } from "@/lib/db/hooks";
import { replaceEquipment } from "@/lib/db/repositories/equipment";
import { replaceStaples } from "@/lib/db/repositories/pantry";
import { getSetting, setSetting } from "@/lib/db/repositories/settings";
import { formatServings } from "@/lib/format";
import type { IngredientCategory } from "@/lib/schemas/ingredient";

// Categories whose common items are offered as staples (beyond the defaults).
const STAPLE_CATEGORIES = new Set<IngredientCategory>(["spices", "oils", "grains", "legumes", "sauces", "other"]);

const MIN_HOUSEHOLD = 1;
const MAX_HOUSEHOLD = 20;
const QUICK_HOUSEHOLD = [1, 2, 3, 4, 5, 6, 7, 8];
const STEP_COUNT = 3;

export default function OnboardingPage() {
  const pantryRows = usePantryRows();
  const equipmentRows = useEquipmentRows();
  const settings = useSettings();

  if (!pantryRows || !equipmentRows || !settings) return <Splash />;

  // Re-running from settings starts from the current kitchen, not the defaults.
  const rerun = settings.onboardingDone;
  const initialStaples = rerun ? pantryRows.filter((row) => row.isStaple).map((row) => row.ingredientId) : defaultStapleIds;
  const initialEquipment = rerun
    ? equipmentRows.filter((row) => row.available).map((row) => row.equipmentId)
    : defaultEquipmentIds;

  return (
    <Wizard
      initialHousehold={settings.householdSize}
      initialStaples={initialStaples}
      initialEquipment={initialEquipment}
      rerun={rerun}
    />
  );
}

interface WizardProps {
  initialHousehold: number;
  initialStaples: string[];
  initialEquipment: string[];
  rerun: boolean;
}

function Wizard({ initialHousehold, initialStaples, initialEquipment, rerun }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [household, setHousehold] = useState(initialHousehold);
  const [staples, setStaples] = useState(() => new Set(initialStaples));
  const [equipment, setEquipment] = useState(() => new Set(initialEquipment.filter((id) => equipmentById.has(id))));
  const [saving, setSaving] = useState(false);

  // Offered staples: the defaults, common pantry-type items, and anything the
  // user had already pinned. Grouped by category.
  const groups = useMemo(() => {
    const pinned = new Set(initialStaples);
    return ingredientCategories
      .map((category) => ({
        category,
        items: ingredients.filter(
          (item) =>
            item.category === category.id &&
            (item.defaultStaple || pinned.has(item.id) || (item.common && STAPLE_CATEGORIES.has(item.category))),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [initialStaples]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const finish = async () => {
    setSaving(true);
    // Keep pinned items that are not listed here (e.g. custom ingredients).
    const listed = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
    const hidden = initialStaples.filter((id) => !listed.has(id));
    await replaceStaples([...staples, ...hidden]);
    await replaceEquipment([...equipment]);
    await setSetting("householdSize", household);
    await setSetting("onboardingDone", true);
    if ((await getSetting("installedAt")) === 0) await setSetting("installedAt", Date.now());
    // Ask the browser not to evict IndexedDB under storage pressure.
    void navigator.storage?.persist?.().catch(() => false);
    router.replace(rerun ? "/settings" : "/");
  };

  return (
    <div className="flex flex-col gap-5 pb-28">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-sm font-semibold text-base-content/65" aria-label={`الخطوة ${step + 1} من ${STEP_COUNT}`}>
            {step + 1} / {STEP_COUNT}
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <span key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-content/10">
              <span
                className={`block h-full rounded-full bg-primary transition-transform duration-500 ease-out-soft ${
                  index <= step ? "scale-x-100" : "scale-x-0"
                }`}
                style={{ transformOrigin: "right" }}
              />
            </span>
          ))}
        </div>
      </header>

      {step === 0 ? (
        <div key="household" className="flex animate-page flex-col gap-5">
          <div>
            <h1 className="font-display text-3xl leading-snug">كم شخصاً في البيت؟</h1>
            <p className="mt-1 text-sm leading-relaxed text-base-content/65">
              عدد من تطبخ لهم عادةً. يمكنك تغييره لاحقاً من «إعدادات».
            </p>
          </div>

          <div className="surface flex flex-col items-center gap-5 p-6">
            <div className="flex min-h-18 flex-wrap items-center justify-center gap-1 text-3xl" aria-hidden="true">
              {Array.from({ length: household }, (_, index) => (
                <Emoji key={index} className="animate-pop">
                  🍽️
                </Emoji>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="أنقص"
                disabled={household <= MIN_HOUSEHOLD}
                onClick={() => setHousehold((current) => Math.max(MIN_HOUSEHOLD, current - 1))}
                className="btn btn-circle size-14 bg-base-200"
              >
                <Minus className="size-5" />
              </button>
              <div className="w-28 text-center" aria-live="polite">
                <span key={household} className="block animate-pop font-display text-6xl leading-none tabular-nums">
                  {household}
                </span>
                <span className="sr-only">{formatServings(household)}</span>
              </div>
              <button
                type="button"
                aria-label="زد"
                disabled={household >= MAX_HOUSEHOLD}
                onClick={() => setHousehold((current) => Math.min(MAX_HOUSEHOLD, current + 1))}
                className="btn btn-circle size-14 bg-base-200"
              >
                <Plus className="size-5" />
              </button>
            </div>
            <div className="grid w-full grid-cols-4 gap-2" role="group" aria-label="اختيار سريع لعدد الأفراد">
              {QUICK_HOUSEHOLD.map((count) => (
                <Chip key={count} fill active={household === count} onToggle={() => setHousehold(count)}>
                  {count}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : step === 1 ? (
        <div key="staples" className="flex animate-page flex-col gap-5">
          <div>
            <h1 className="font-display text-3xl leading-snug">ما الذي لا ينقطع من مطبخك؟</h1>
            <p className="mt-1 text-sm leading-relaxed text-base-content/65">
              اخترنا لك الأساسيات الشائعة — عدّلها كما تشاء. الأساسيات تبقى «متوفرة» دائماً حتى تلغيها أنت.
            </p>
          </div>
          {groups.map(({ category, items }) => (
            <section key={category.id} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-base-content/70">
                <Emoji>{category.emoji}</Emoji>
                {category.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <IngredientToggle
                    key={item.id}
                    name={item.name}
                    emoji={item.emoji ?? ingredientCategoryById[item.category].emoji}
                    active={staples.has(item.id)}
                    onToggle={() => setStaples((current) => toggle(current, item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div key="equipment" className="flex animate-page flex-col gap-5">
          <div>
            <h1 className="font-display text-3xl leading-snug">ما الأدوات التي عندك؟</h1>
            <p className="mt-1 text-sm leading-relaxed text-base-content/65">
              لن نقترح وصفة تحتاج فرناً إن لم يكن عندك فرن. يمكنك تعديلها لاحقاً من «مطبخي».
            </p>
          </div>
          <EquipmentList selected={equipment} onToggle={(id) => setEquipment((current) => toggle(current, id))} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-base-content/8 bg-base-100/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step === 2 ? 1 : 0)}
              disabled={saving}
              aria-label="رجوع"
              className="btn btn-ghost btn-lg rounded-full bg-base-200"
            >
              <ArrowRight className="size-5" />
            </button>
          )}
          {step === 2 ? (
            <button type="button" onClick={finish} disabled={saving} className="btn btn-primary btn-lg flex-1 rounded-full">
              {saving ? <span className="loading loading-spinner" /> : <Emoji>🍳</Emoji>}
              {rerun ? "احفظ" : "ابدأ الطبخ"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === 0 ? 1 : 2)}
              className="btn btn-primary btn-lg flex-1 rounded-full"
            >
              {step === 0
                ? `التالي — ${household === 1 ? "شخص واحد" : formatServings(household)}`
                : `التالي — ${staples.size} من الأساسيات`}
              <ArrowLeft className="size-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
