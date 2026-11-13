"use client";

import {
  ChevronLeft,
  Download,
  KeyRound,
  Minus,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { OnlineBadge } from "@/components/layout/online-badge";
import { BrandMark } from "@/components/ui/brand";
import { Emoji } from "@/components/ui/emoji";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { ingredients } from "@/data/ingredients";
import { allRecipes } from "@/data/recipes";
import { APP_NAME, APP_VERSION } from "@/lib/app-info";
import { useAiRecipes, useSettings } from "@/lib/db/hooks";
import {
  clearAllData,
  exportBackup,
  importBackup,
  parseBackup,
  summarizeBackup,
} from "@/lib/db/repositories/backup";
import { dateKey } from "@/lib/db/repositories/dayPlan";
import { setSetting } from "@/lib/db/repositories/settings";
import { setThemeChoice, useThemeChoice } from "@/lib/hooks/use-theme";
import { toggleIn } from "@/lib/kitchen/ui-state";
import { mealTypeLabels } from "@/lib/labels";
import type { Backup } from "@/lib/schemas/backup";
import type { MealType } from "@/lib/schemas/recipe";
import type { ThemeChoice } from "@/lib/theme";

const MEAL_TYPES: MealType[] = ["meat", "chicken", "fish", "vegetarian", "vegan"];
const dateFormat = new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium" });

function Card({ title, icon, id, children }: { title: string; icon: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="surface flex scroll-mt-4 flex-col gap-4 p-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Whether the browser promised not to evict our IndexedDB data. */
function usePersistedStorage() {
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void navigator.storage
      ?.persisted?.()
      .then((value) => {
        if (!cancelled) setPersisted(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const request = async () => {
    const granted = (await navigator.storage?.persist?.().catch(() => false)) ?? false;
    setPersisted(granted);
    return granted;
  };

  return { persisted, request };
}

export default function SettingsPage() {
  const toast = useToast();
  const settings = useSettings();
  const aiRecipes = useAiRecipes();
  const theme = useThemeChoice();
  const storage = usePersistedStorage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `malliqa-backup-${dateKey()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await setSetting("lastBackupAt", Date.now());
      toast("حُفظت النسخة الاحتياطية", { emoji: "💾" });
    } catch {
      toast("تعذّر إنشاء النسخة", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      toast(result.reason === "not-json" ? "الملف ليس JSON صالحاً" : "هذا ليس ملف نسخة احتياطية من ملّيقة", {
        tone: "error",
      });
      return;
    }
    // Never overwrite silently: show a summary and ask first.
    setPendingBackup(result.backup);
  };

  const onConfirmImport = async () => {
    if (!pendingBackup) return;
    setBusy(true);
    try {
      await importBackup(pendingBackup);
      toast("استُعيدت بياناتك", { emoji: "✅" });
      setPendingBackup(null);
    } catch {
      toast("تعذّر الاستيراد — لم يتغير شيء", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    await clearAllData();
    setConfirmReset(false);
    // The onboarding gate takes over from here.
  };

  const summary = pendingBackup ? summarizeBackup(pendingBackup) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="إعدادات" action={<OnlineBadge />} />

      <Card title="المظهر" icon={<Sun className="size-4" />}>
        <Segmented<ThemeChoice>
          label="المظهر"
          value={theme}
          onChange={setThemeChoice}
          className="bg-base-200/70"
          options={[
            { value: "system", label: <><Monitor className="size-4" /> تلقائي</> },
            { value: "light", label: <><Sun className="size-4" /> فاتح</> },
            { value: "dark", label: <><Moon className="size-4" /> داكن</> },
          ]}
        />
      </Card>

      <Card title="التفضيلات" icon={<Emoji>🍽️</Emoji>}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">عدد أفراد البيت</p>
            <p className="text-xs text-base-content/65">للعلم فقط الآن — تعديل الكميات يأتي لاحقاً.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-base-200/70 p-1">
            <button
              type="button"
              aria-label="أنقص"
              disabled={!settings || settings.householdSize <= 1}
              onClick={() => settings && void setSetting("householdSize", settings.householdSize - 1)}
              className="btn btn-circle btn-ghost size-11"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">
              {settings?.householdSize ?? "…"}
            </span>
            <button
              type="button"
              aria-label="زد"
              disabled={!settings || settings.householdSize >= 20}
              onClick={() => settings && void setSetting("householdSize", settings.householdSize + 1)}
              className="btn btn-circle btn-ghost size-11"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">لا تقترح لي</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((type) => {
              const excluded = settings?.excludedMealTypes.includes(type) ?? false;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={excluded}
                  disabled={!settings}
                  onClick={() =>
                    settings && void setSetting("excludedMealTypes", toggleIn(settings.excludedMealTypes, type))
                  }
                  className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${
                    excluded
                      ? "border-error/50 bg-error/12 text-error line-through"
                      : "border-base-content/10 bg-base-200/60 text-base-content/75"
                  }`}
                >
                  <Emoji>{mealTypeLabels[type].emoji}</Emoji>
                  {mealTypeLabels[type].label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-base-content/65">الأنواع المشطوبة تختفي من الاقتراحات ومن صفحة الوصفات.</p>
        </fieldset>
      </Card>

      <Card title="مساعد الذكاء الاصطناعي" icon={<Sparkles className="size-4" />}>
        <AccessTokenField key={settings ? "ready" : "loading"} initial={settings?.aiAccessToken ?? ""} disabled={!settings} />
      </Card>

      <Card title="النسخ الاحتياطي" icon={<Download className="size-4" />} id="backup">
        <p className="text-sm leading-relaxed text-base-content/70">
          بياناتك محفوظة على هذا الجهاز فقط. صدّر نسخة كل فترة، واستوردها على جهاز أو متصفح آخر.
        </p>
        <p className="text-sm">
          آخر نسخة:{" "}
          <b>{settings?.lastBackupAt ? dateFormat.format(settings.lastBackupAt) : "لم تُنشأ بعد"}</b>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onExport} disabled={busy} className="btn btn-primary rounded-full">
            <Download className="size-5" />
            تصدير
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="btn rounded-full bg-base-200">
            <Upload className="size-5" />
            استيراد
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={onFileChosen}
          className="hidden"
          aria-label="اختر ملف النسخة الاحتياطية"
        />
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-base-200/60 p-3">
          <span className="flex items-center gap-2 text-sm">
            <ShieldCheck className={`size-5 ${storage.persisted ? "text-success" : "text-base-content/65"}`} />
            {storage.persisted === null
              ? "حالة التخزين غير معروفة"
              : storage.persisted
                ? "التخزين دائم: لن يمسحه المتصفح تلقائياً"
                : "قد يمسح المتصفح البيانات عند امتلاء الجهاز"}
          </span>
          {storage.persisted === false && (
            <button
              type="button"
              className="btn btn-sm min-h-11 rounded-full bg-base-100"
              onClick={async () => {
                const granted = await storage.request();
                toast(granted ? "صار التخزين دائماً" : "لم يوافق المتصفح — ثبّت التطبيق ثم حاول", {
                  tone: granted ? "success" : "info",
                });
              }}
            >
              فعّل
            </button>
          )}
        </div>
      </Card>

      <Card title="مطبخي" icon={<Emoji>🧺</Emoji>}>
        <div className="flex flex-col divide-y divide-base-content/8">
          <Link href="/my-recipes" className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-primary" />
              وصفاتي المحفوظة
            </span>
            <span className="flex items-center gap-1 text-sm text-base-content/65">
              {aiRecipes?.length ?? 0}
              <ChevronLeft className="size-4" />
            </span>
          </Link>
          <Link href="/onboarding" className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2 font-medium">
              <RotateCcw className="size-4 text-primary" />
              أعد اختيار الأساسيات والأدوات
            </span>
            <ChevronLeft className="size-4 text-base-content/65" />
          </Link>
        </div>
      </Card>

      <section className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-content">
          <BrandMark className="size-9" />
        </span>
        <p className="font-display text-2xl text-primary">{APP_NAME}</p>
        <p className="text-xs text-base-content/65">
          الإصدار {APP_VERSION} · {allRecipes.length} وصفة · {ingredients.length} مكوّناً
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-base-content/65">
          تعمل بلا إنترنت. لا حسابات ولا تتبّع — كل شيء يبقى على جهازك.
        </p>
        <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-ghost btn-sm mt-2 min-h-11 rounded-full text-error">
          <Trash2 className="size-4" />
          امسح كل بياناتي
        </button>
      </section>

      <Sheet open={pendingBackup !== null} onClose={() => setPendingBackup(null)} title="استيراد نسخة احتياطية">
        {summary && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-base-content/70">
              نسخة بتاريخ <b>{dateFormat.format(new Date(summary.exportedAt))}</b> تحتوي على:
            </p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["🧺", "مواد متوفرة", summary.pantryAvailable],
                ["📌", "أساسيات", summary.staples],
                ["✨", "مكونات خاصة", summary.customIngredients],
                ["🍳", "أدوات", summary.equipment],
                ["❤️", "مفضلة", summary.favorites],
                ["📖", "وصفات محفوظة", summary.aiRecipes],
              ].map(([emoji, label, value]) => (
                <li key={label} className="flex items-center gap-2 rounded-2xl bg-base-200/60 p-3">
                  <Emoji className="text-xl">{String(emoji)}</Emoji>
                  <span className="min-w-0 flex-1">{label}</span>
                  <b className="tabular-nums">{value}</b>
                </li>
              ))}
            </ul>
            <p role="alert" className="rounded-2xl bg-warning/22 p-3 text-sm leading-relaxed">
              الاستيراد <b>يستبدل كل بياناتك الحالية</b> على هذا الجهاز بمحتوى النسخة.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPendingBackup(null)} disabled={busy} className="btn btn-lg rounded-full bg-base-200">
                إلغاء
              </button>
              <button type="button" onClick={onConfirmImport} disabled={busy} className="btn btn-primary btn-lg rounded-full">
                {busy && <span className="loading loading-spinner" />}
                استبدل الكل
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="مسح كل البيانات؟">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-base-content/75">
            سيُمسح مطبخك وأدواتك ومفضلتك ووصفاتك المحفوظة وإعداداتك من هذا الجهاز، وتبدأ من الإعداد الأول. لا يمكن
            التراجع — صدّر نسخة احتياطية أولاً إن أردت.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-lg rounded-full bg-base-200">
              إلغاء
            </button>
            <button type="button" onClick={onReset} className="btn btn-error btn-lg rounded-full">
              امسح كل شيء
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

/** Optional shared secret for the AI route (only needed when the server sets APP_ACCESS_TOKEN). */
function AccessTokenField({ initial, disabled }: { initial: string; disabled: boolean }) {
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const dirty = value.trim() !== initial;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await setSetting("aiAccessToken", value.trim());
        toast(value.trim() ? "حُفظ رمز الوصول" : "أُزيل رمز الوصول", { emoji: "🔑" });
      }}
    >
      <label htmlFor="ai-token" className="font-semibold">
        رمز الوصول <span className="font-normal text-base-content/65">(اختياري)</span>
      </label>
      <div className="flex gap-2">
        <label className="input w-full flex-1 rounded-full bg-base-200/60">
          <KeyRound className="size-4 opacity-50" />
          <input
            id="ai-token"
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={disabled}
            autoComplete="off"
            dir="ltr"
            placeholder="••••••••"
            className="min-h-11"
          />
        </label>
        <button type="submit" disabled={disabled || !dirty} className="btn btn-primary min-h-11 rounded-full">
          احفظ
        </button>
      </div>
      <p className="text-xs leading-relaxed text-base-content/65">
        يلزم فقط إذا كان مسار المساعد محمياً برمز (APP_ACCESS_TOKEN). يبقى على هذا الجهاز ولا يدخل في النسخ الاحتياطية.
      </p>
    </form>
  );
}
