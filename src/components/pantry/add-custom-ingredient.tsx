"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Emoji } from "@/components/ui/emoji";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { ingredientCategories } from "@/data/categories";
import { ingredientGroups } from "@/data/ingredients";
import { addCustomIngredient } from "@/lib/db/repositories/pantry";
import { findIngredientIdByName } from "@/lib/kitchen/names";
import type { IngredientCategory } from "@/lib/schemas/ingredient";

interface AddCustomIngredientProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fills the name (e.g. from a search with no results). */
  initialName?: string;
  initialCategory?: IngredientCategory;
}

/** Sheet for adding an ingredient that is not in the dictionary: name + category. */
export function AddCustomIngredient({ open, onClose, initialName = "", initialCategory }: AddCustomIngredientProps) {
  return (
    <Sheet open={open} onClose={onClose} title="مكوّن جديد">
      <AddForm key={`${initialName}|${initialCategory ?? ""}`} onDone={onClose} initialName={initialName} initialCategory={initialCategory} />
    </Sheet>
  );
}

function AddForm({
  onDone,
  initialName,
  initialCategory,
}: {
  onDone: () => void;
  initialName: string;
  initialCategory?: IngredientCategory;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<IngredientCategory>(initialCategory ?? "other");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const alreadyInDictionary = trimmed.length > 0 && findIngredientIdByName(trimmed) !== undefined;
  const canSave = trimmed.length > 0 && !alreadyInDictionary && !saving;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await addCustomIngredient({ name: trimmed, category, groups: groupId ? [groupId] : undefined });
      toast(`أُضيف «${trimmed}» إلى مطبخك`, { emoji: "✨" });
      onDone();
    } catch {
      toast("تعذّر الحفظ، حاول مرة أخرى", { tone: "error" });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">اسم المكوّن</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          autoFocus
          enterKeyHint="done"
          placeholder="مثال: دبس خرنوب"
          className="input input-lg w-full rounded-2xl"
          aria-describedby={alreadyInDictionary ? "custom-exists" : undefined}
        />
        {alreadyInDictionary && (
          <span id="custom-exists" className="text-sm text-warning-content/80">
            هذا المكوّن موجود في القائمة — ابحث عنه وفعّله.
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">الفئة</legend>
        <div className="flex flex-wrap gap-2">
          {ingredientCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${
                category === item.id
                  ? "border-primary bg-primary text-primary-content"
                  : "border-base-content/10 bg-base-200/60 text-base-content/75"
              }`}
            >
              <Emoji>{item.emoji}</Emoji>
              {item.shortName}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          يقوم مقام <span className="font-normal text-base-content/55">(اختياري)</span>
        </span>
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="select select-lg w-full rounded-2xl">
          <option value="">لا شيء</option>
          {ingredientGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-base-content/55">مثلاً: صلصة بيتية تقوم مقام «قاعدة طماطم» في الوصفات.</span>
      </label>

      <button type="submit" disabled={!canSave} className="btn btn-primary btn-lg rounded-full">
        <Plus className="size-5" />
        أضف إلى مطبخي
      </button>
    </form>
  );
}
