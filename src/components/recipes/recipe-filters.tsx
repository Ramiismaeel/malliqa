import { Chip } from "@/components/ui/chip";
import { Emoji } from "@/components/ui/emoji";
import { toggleIn, type HomeFilters, type MealChip } from "@/lib/kitchen/ui-state";
import { cuisineLabels, difficultyLabels, timeBucketLabels } from "@/lib/labels";
import type { TimeBucket } from "@/lib/matching/timeBucket";
import type { Cuisine, Difficulty } from "@/lib/schemas/recipe";

const TIME_OPTIONS: Array<{ value: TimeBucket; emoji: string }> = [
  { value: "quick", emoji: "⚡" },
  { value: "medium", emoji: "⏱️" },
  { value: "long", emoji: "🕰️" },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];

const MEAL_OPTIONS: Array<{ value: MealChip; label: string; emoji: string }> = [
  { value: "meat", label: "لحوم", emoji: "🥩" },
  { value: "chicken", label: "دجاج", emoji: "🍗" },
  { value: "fish", label: "سمك", emoji: "🐟" },
  { value: "veg", label: "نباتي", emoji: "🥗" },
];

const CUISINE_OPTIONS: Cuisine[] = ["syrian", "levantine", "arab", "italian", "asian", "quick", "bakery"];

function Divider() {
  return <span aria-hidden="true" className="my-2 w-px shrink-0 bg-base-content/12" />;
}

interface RecipeFiltersProps<T extends HomeFilters> {
  value: T;
  onChange: (value: T) => void;
}

/** One scrollable row of quick filters: time, difficulty, meal type. */
export function RecipeFilters<T extends HomeFilters>({ value, onChange }: RecipeFiltersProps<T>) {
  return (
    <div className="scroll-row -mx-4 px-4 py-1" role="group" aria-label="تصفية الوصفات">
      {TIME_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          active={value.time.includes(option.value)}
          onToggle={() => onChange({ ...value, time: toggleIn(value.time, option.value) })}
        >
          <Emoji>{option.emoji}</Emoji>
          {timeBucketLabels[option.value].label}
        </Chip>
      ))}
      <Divider />
      {MEAL_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          active={value.meal.includes(option.value)}
          onToggle={() => onChange({ ...value, meal: toggleIn(value.meal, option.value) })}
        >
          <Emoji>{option.emoji}</Emoji>
          {option.label}
        </Chip>
      ))}
      <Divider />
      {DIFFICULTY_OPTIONS.map((option) => (
        <Chip
          key={option}
          active={value.difficulty.includes(option)}
          onToggle={() => onChange({ ...value, difficulty: toggleIn(value.difficulty, option) })}
        >
          {difficultyLabels[option]}
        </Chip>
      ))}
    </div>
  );
}

interface CuisineFiltersProps {
  value: Cuisine[];
  onChange: (value: Cuisine[]) => void;
}

export function CuisineFilters({ value, onChange }: CuisineFiltersProps) {
  return (
    <div className="scroll-row -mx-4 px-4 py-1" role="group" aria-label="المطبخ">
      {CUISINE_OPTIONS.map((cuisine) => (
        <Chip key={cuisine} active={value.includes(cuisine)} onToggle={() => onChange(toggleIn(value, cuisine))}>
          <Emoji>{cuisineLabels[cuisine].emoji}</Emoji>
          {cuisineLabels[cuisine].label}
        </Chip>
      ))}
    </div>
  );
}

export function hasActiveFilters(filters: HomeFilters): boolean {
  return filters.time.length > 0 || filters.difficulty.length > 0 || filters.meal.length > 0;
}
