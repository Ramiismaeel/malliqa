"use client";

import { Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Emoji } from "@/components/ui/emoji";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { ingredientCategories, ingredientCategoryById } from "@/data/categories";
import { ingredients } from "@/data/ingredients";
import {
  deleteCustomIngredient,
  markRanOut,
  setAvailable,
  setStaple,
} from "@/lib/db/repositories/pantry";
import { findIngredientIdByName, ingredientSearchText } from "@/lib/kitchen/names";
import type { CustomIngredient, PantryRow } from "@/lib/schemas/backup";
import type { IngredientCategory } from "@/lib/schemas/ingredient";
import { matchesQuery } from "@/lib/text/arabic";
import { AddCustomIngredient } from "./add-custom-ingredient";
import { CategoryChips, type CategoryFilter } from "./category-chips";
import { IngredientToggle } from "./ingredient-toggle";

interface PantryItem {
  id: string;
  name: string;
  emoji: string;
  category: IngredientCategory;
  searchText: string;
  common: boolean;
  custom: boolean;
}

interface PantryIngredientsProps {
  pantryRows: PantryRow[];
  customIngredients: CustomIngredient[];
}

const QUICK_ADD_LIMIT = 24;
const categoryOrder = new Map(ingredientCategories.map((category, index) => [category.id, index]));

const builtinItems: PantryItem[] = ingredients.map((ingredient) => ({
  id: ingredient.id,
  name: ingredient.name,
  emoji: ingredient.emoji ?? ingredientCategoryById[ingredient.category].emoji,
  category: ingredient.category,
  searchText: ingredientSearchText(ingredient),
  common: ingredient.common ?? false,
  custom: false,
}));

/** The "المكونات" tab: search, category chips, toggles, staples and custom items. */
export function PantryIngredients({ pantryRows, customIngredients }: PantryIngredientsProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const items = useMemo<PantryItem[]>(
    () => [
      ...customIngredients.map((custom) => ({
        id: custom.id,
        name: custom.name,
        emoji: "✨",
        category: custom.category,
        searchText: custom.name,
        common: true,
        custom: true,
      })),
      ...builtinItems,
    ],
    [customIngredients],
  );

  const rowById = useMemo(() => new Map(pantryRows.map((row) => [row.ingredientId, row])), [pantryRows]);
  const isAvailable = (id: string) => rowById.get(id)?.available ?? false;
  const isStaple = (id: string) => rowById.get(id)?.isStaple ?? false;

  const counts = useMemo(() => {
    const result: Partial<Record<IngredientCategory, number>> = {};
    for (const item of items) {
      if (rowById.get(item.id)?.available) result[item.category] = (result[item.category] ?? 0) + 1;
    }
    return result;
  }, [items, rowById]);

  // Available first, then staples, then common, then alphabetical.
  const sortItems = (list: PantryItem[]) =>
    [...list].sort(
      (a, b) =>
        Number(isAvailable(b.id)) - Number(isAvailable(a.id)) ||
        Number(isStaple(b.id)) - Number(isStaple(a.id)) ||
        Number(b.common) - Number(a.common) ||
        a.name.localeCompare(b.name, "ar"),
    );

  const toggle = async (item: PantryItem) => {
    const next = !isAvailable(item.id);
    await setAvailable(item.id, next);
    if (!next) toast(`نفد: ${item.name}`, { emoji: "🫙", tone: "info" });
  };

  const renderToggle = (item: PantryItem) => (
    <IngredientToggle
      key={item.id}
      name={item.name}
      emoji={item.emoji}
      active={isAvailable(item.id)}
      staple={isStaple(item.id)}
      onToggle={() => void toggle(item)}
      onMenu={() => setMenuId(item.id)}
    />
  );

  const trimmedQuery = query.trim();
  const menuItem = menuId ? items.find((item) => item.id === menuId) : undefined;

  let content: React.ReactNode;

  if (trimmedQuery) {
    const results = sortItems(items.filter((item) => matchesQuery(item.searchText, trimmedQuery)));
    content = (
      <div className="flex flex-col gap-4">
        {results.length > 0 ? (
          <div className="flex flex-wrap gap-2">{results.map(renderToggle)}</div>
        ) : (
          <EmptyState emoji="🔎" title="لا نتائج">
            لم نجد «{trimmedQuery}» في القائمة. يمكنك إضافته كمكوّن خاص بك.
          </EmptyState>
        )}
        {findIngredientIdByName(trimmedQuery) === undefined && !results.some((item) => item.name === trimmedQuery) && (
          <button type="button" onClick={() => setAddOpen(true)} className="btn btn-outline btn-primary rounded-full">
            <Plus className="size-5" />
            أضف «{trimmedQuery}» كمكوّن جديد
          </button>
        )}
      </div>
    );
  } else if (category === "all") {
    const fresh = sortItems(items.filter((item) => isAvailable(item.id) && !isStaple(item.id)));
    const staples = sortItems(items.filter((item) => isStaple(item.id)));
    const quickAdd = items
      .filter((item) => item.common && !item.custom && !isAvailable(item.id) && !isStaple(item.id))
      .sort((a, b) => (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0))
      .slice(0, QUICK_ADD_LIMIT);

    content = (
      <div className="flex flex-col gap-7">
        <Section title="عندي الآن" emoji="🧺" count={fresh.length} hint="اضغط على المادة عند نفادها">
          {fresh.length > 0 ? (
            <div className="flex flex-wrap gap-2">{fresh.map(renderToggle)}</div>
          ) : (
            <div className="surface px-4 py-5 text-center text-sm leading-relaxed text-base-content/65">
              <Emoji className="mb-2 block text-3xl">🛒</Emoji>
              ماذا اشتريت اليوم؟ اختر فئة من الأعلى أو أضف من القائمة السريعة.
            </div>
          )}
        </Section>

        {quickAdd.length > 0 && (
          <Section title="أضف سريعاً" emoji="⚡" hint="الأكثر استعمالاً — لمسة واحدة لكل مادة">
            <div className="flex flex-wrap gap-2">{quickAdd.map(renderToggle)}</div>
          </Section>
        )}

        <Section title="الأساسيات" emoji="📌" count={staples.length} hint="تبقى متوفرة دائماً — اضغط مطوّلاً على أي مادة لتثبيتها">
          {staples.length > 0 ? (
            <div className="flex flex-wrap gap-2">{staples.map(renderToggle)}</div>
          ) : (
            <p className="px-1 text-sm text-base-content/65">لا أساسيات بعد. اضغط مطوّلاً على مادة واختر «ثبّت كأساسي».</p>
          )}
        </Section>
      </div>
    );
  } else {
    const inCategory = sortItems(items.filter((item) => item.category === category));
    const primary = inCategory.filter((item) => item.common || isAvailable(item.id) || isStaple(item.id));
    const rest = inCategory.filter((item) => !primary.includes(item));
    const info = ingredientCategoryById[category];

    content = (
      <Section title={info.name} emoji={info.emoji} count={counts[category] ?? 0} hint="اضغط للتبديل · اضغط مطوّلاً للتثبيت كأساسي">
        <div className="flex flex-wrap gap-2">
          {primary.map(renderToggle)}
          {showAll && rest.map(renderToggle)}
        </div>
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="btn btn-ghost btn-sm min-h-11 self-start rounded-full text-primary"
          >
            {showAll ? "عرض أقل" : `المزيد (${rest.length})`}
          </button>
        )}
      </Section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <label className="input input-lg flex-1 rounded-full bg-base-100">
          <Search className="size-5 opacity-50" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث: بندورة، لحمة، كزبرة…"
            aria-label="ابحث عن مكوّن"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="امسح البحث" className="-me-3 grid size-11 shrink-0 place-items-center rounded-full">
              <X className="size-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="أضف مكوّناً جديداً"
          className="btn btn-primary btn-circle btn-lg shadow-md shadow-primary/25"
        >
          <Plus className="size-6" />
        </button>
      </div>

      {!trimmedQuery && (
        <CategoryChips
          value={category}
          onChange={(value) => {
            setCategory(value);
            setShowAll(false);
          }}
          counts={counts}
        />
      )}

      <div key={trimmedQuery ? "search" : category} className="animate-page">
        {content}
      </div>

      <AddCustomIngredient
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialName={trimmedQuery}
        initialCategory={category === "all" ? undefined : category}
      />

      <Sheet open={menuItem !== undefined} onClose={() => setMenuId(null)} title={menuItem?.name ?? ""}>
        {menuItem && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-sm text-base-content/65">
              {isStaple(menuItem.id)
                ? "مثبّت كأساسي: يُعدّ متوفراً دائماً حتى تغيّره أنت."
                : "الأساسيات مواد لا تنقطع من مطبخك (ملح، زيت، أرز…)."}
            </p>
            <button
              type="button"
              className="btn btn-lg justify-start rounded-2xl"
              onClick={async () => {
                const next = !isStaple(menuItem.id);
                await setStaple(menuItem.id, next);
                toast(next ? `ثُبّت «${menuItem.name}» كأساسي` : `أُلغي تثبيت «${menuItem.name}»`, { emoji: "📌" });
                setMenuId(null);
              }}
            >
              {isStaple(menuItem.id) ? <PinOff className="size-5" /> : <Pin className="size-5 text-primary" />}
              {isStaple(menuItem.id) ? "ألغِ التثبيت كأساسي" : "ثبّت كأساسي"}
            </button>
            {isAvailable(menuItem.id) && (
              <button
                type="button"
                className="btn btn-lg justify-start rounded-2xl"
                onClick={async () => {
                  await markRanOut(menuItem.id);
                  toast(`نفد: ${menuItem.name}`, { emoji: "🫙", tone: "info" });
                  setMenuId(null);
                }}
              >
                <Emoji className="text-lg">🫙</Emoji>
                نفد
              </button>
            )}
            {menuItem.custom && (
              <button
                type="button"
                className="btn btn-lg justify-start rounded-2xl text-error"
                onClick={async () => {
                  await deleteCustomIngredient(menuItem.id);
                  toast(`حُذف «${menuItem.name}»`, { emoji: "🗑️", tone: "info" });
                  setMenuId(null);
                }}
              >
                <Trash2 className="size-5" />
                احذف هذا المكوّن
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
