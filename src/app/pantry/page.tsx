"use client";

import { useState } from "react";
import { OnlineBadge } from "@/components/layout/online-badge";
import { EquipmentList } from "@/components/pantry/equipment-list";
import { PantryIngredients } from "@/components/pantry/pantry-ingredients";
import { Emoji } from "@/components/ui/emoji";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { capabilitiesOf } from "@/data/equipment";
import { useCustomIngredients, useEquipmentRows, usePantryRows } from "@/lib/db/hooks";
import { toggleEquipment } from "@/lib/db/repositories/equipment";

type Tab = "ingredients" | "equipment";

export default function PantryPage() {
  const pantryRows = usePantryRows();
  const customIngredients = useCustomIngredients();
  const equipmentRows = useEquipmentRows();
  const [tab, setTab] = useState<Tab>("ingredients");

  const loading = !pantryRows || !customIngredients || !equipmentRows;
  const availableCount = pantryRows?.filter((row) => row.available).length ?? 0;
  const equipmentIds = new Set((equipmentRows ?? []).filter((row) => row.available).map((row) => row.equipmentId));
  const hasHeat = capabilitiesOf(equipmentIds).has("stovetop");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="مطبخي"
        subtitle={loading ? "…" : `${availableCount} مادة متوفرة · ${equipmentIds.size} أدوات`}
        action={<OnlineBadge />}
      />

      <Segmented
        label="أقسام المطبخ"
        value={tab}
        onChange={setTab}
        options={[
          { value: "ingredients", label: <><Emoji>🥕</Emoji> المكونات</> },
          { value: "equipment", label: <><Emoji>🍳</Emoji> الأدوات</> },
        ]}
      />

      {loading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="skeleton-warm h-14" />
          <div className="skeleton-warm h-11" />
          <div className="skeleton-warm h-40" />
        </div>
      ) : tab === "ingredients" ? (
        <PantryIngredients pantryRows={pantryRows} customIngredients={customIngredients} />
      ) : (
        <div className="flex animate-page flex-col gap-4">
          {!hasHeat && (
            <div role="alert" className="flex items-start gap-3 rounded-3xl bg-warning/20 p-4 text-sm leading-relaxed">
              <Emoji className="text-2xl">🔥</Emoji>
              <span>لم تحدّد موقداً. بدونه ستظهر فقط السلطات والسندويشات وما لا يحتاج طبخاً.</span>
            </div>
          )}
          <EquipmentList selected={equipmentIds} onToggle={(id) => void toggleEquipment(id)} />
        </div>
      )}
    </div>
  );
}
