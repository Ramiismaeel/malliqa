"use client";

import { Check } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Emoji } from "@/components/ui/emoji";
import { FoodProcessorArt } from "@/components/ui/food-processor-icon";
import { equipmentCategories } from "@/data/categories";
import { equipment } from "@/data/equipment";

/** Equipment with no fitting emoji gets its own drawing. */
const CUSTOM_ART: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "food-processor": FoodProcessorArt,
};

interface EquipmentListProps {
  selected: ReadonlySet<string>;
  onToggle: (equipmentId: string) => void;
}

/** Equipment grouped by category, as toggle cards. Used by pantry and onboarding. */
export function EquipmentList({ selected, onToggle }: EquipmentListProps) {
  return (
    <div className="flex flex-col gap-5">
      {equipmentCategories.map((category) => {
        const items = equipment.filter((item) => item.category === category.id);
        if (items.length === 0) return null;
        return (
          <section key={category.id} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-base-content/70">
              <Emoji>{category.emoji}</Emoji>
              {category.name}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item, index) => {
                const active = selected.has(item.id);
                const Art = CUSTOM_ART[item.id];
                const artState = `transition-transform duration-300 ease-spring ${active ? "scale-110" : "grayscale-[0.6]"}`;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(item.id)}
                    style={{ animationDelay: `${index * 35}ms` }}
                    className={`pressable relative flex min-h-24 animate-rise flex-col items-start justify-between gap-2 rounded-3xl border p-3 text-start ${
                      active
                        ? "border-secondary/50 bg-secondary/15 shadow-sm"
                        : "border-base-content/10 bg-base-100 text-base-content/70"
                    }`}
                  >
                    <span className="flex w-full items-start justify-between">
                      {Art ? (
                        <Art className={`size-9 ${artState}`} />
                      ) : (
                        <Emoji className={`text-3xl ${artState}`}>{item.emoji ?? "🍳"}</Emoji>
                      )}
                      <span
                        className={`grid size-6 place-items-center rounded-full border transition-colors ${
                          active ? "border-secondary bg-secondary text-secondary-content" : "border-base-content/20"
                        }`}
                      >
                        {active && <Check className="size-3.5 animate-pop" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="text-sm leading-snug font-semibold">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
