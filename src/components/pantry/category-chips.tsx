import { Chip } from "@/components/ui/chip";
import { Emoji } from "@/components/ui/emoji";
import { ingredientCategories } from "@/data/categories";
import type { IngredientCategory } from "@/lib/schemas/ingredient";

export type CategoryFilter = IngredientCategory | "all";

interface CategoryChipsProps {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
  /** Number of available items per category. */
  counts: Partial<Record<IngredientCategory, number>>;
}

/** Category chips with "available" counts; they wrap so all are always visible. */
export function CategoryChips({ value, onChange, counts }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="فئات المكونات">
      <Chip active={value === "all"} onToggle={() => onChange("all")}>
        <Emoji>🧺</Emoji>
        عندي
      </Chip>
      {ingredientCategories.map((category) => (
        <Chip
          key={category.id}
          active={value === category.id}
          onToggle={() => onChange(value === category.id ? "all" : category.id)}
          count={counts[category.id] || undefined}
        >
          <Emoji>{category.emoji}</Emoji>
          {category.shortName}
        </Chip>
      ))}
    </div>
  );
}
