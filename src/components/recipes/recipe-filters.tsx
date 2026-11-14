import { Chip } from "@/components/ui/chip";
import { Emoji } from "@/components/ui/emoji";
import { toggleIn, type HomeFilters, type MealChip } from "@/lib/kitchen/ui-state";
import { courseLabels, cuisineLabels, difficultyLabels, timeBucketLabels } from "@/lib/labels";
import type { TimeBucket } from "@/lib/matching/timeBucket";
import type { Course, Cuisine, Difficulty } from "@/lib/schemas/recipe";

const COURSE_OPTIONS: Course[] = ["main", "appetizer", "dessert"];

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

interface RecipeFiltersProps<T extends HomeFilters> {
  value: T;
  onChange: (value: T) => void;
  /**
   * Home page: only course, time and «نباتي», in two rows. The full set
   * (every meal type, difficulty) lives in the recipes page's filter panel.
   */
  compact?: boolean;
}

/**
 * Quick filters: course, time, meal type, difficulty. Each group is one row of
 * equal-width chips, so every filter is visible on any screen width — no
 * horizontal scrolling and nothing cut off.
 */
export function RecipeFilters<T extends HomeFilters>({ value, onChange, compact = false }: RecipeFiltersProps<T>) {
  const courseRow = (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="نوع الطبق">
      {COURSE_OPTIONS.map((option) => (
        <Chip
          key={option}
          fill
          active={value.course.includes(option)}
          onToggle={() => onChange({ ...value, course: toggleIn(value.course, option) })}
        >
          <Emoji>{courseLabels[option].emoji}</Emoji>
          {courseLabels[option].label}
        </Chip>
      ))}
    </div>
  );
  const timeChips = TIME_OPTIONS.map((option) => (
    <Chip
      key={option.value}
      fill
      active={value.time.includes(option.value)}
      onToggle={() => onChange({ ...value, time: toggleIn(value.time, option.value) })}
    >
      <Emoji>{option.emoji}</Emoji>
      {timeBucketLabels[option.value].label}
    </Chip>
  ));

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {courseRow}
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="المدة والنوع">
          {timeChips}
          <Chip fill active={value.meal.includes("veg")} onToggle={() => onChange({ ...value, meal: toggleIn(value.meal, "veg") })}>
            <Emoji>🥗</Emoji>
            نباتي
          </Chip>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {courseRow}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="المدة">
        {timeChips}
      </div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="نوع الوجبة">
        {MEAL_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            fill
            active={value.meal.includes(option.value)}
            onToggle={() => onChange({ ...value, meal: toggleIn(value.meal, option.value) })}
          >
            <Emoji>{option.emoji}</Emoji>
            {option.label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="الصعوبة">
        {DIFFICULTY_OPTIONS.map((option) => (
          <Chip
            key={option}
            fill
            active={value.difficulty.includes(option)}
            onToggle={() => onChange({ ...value, difficulty: toggleIn(value.difficulty, option) })}
          >
            {difficultyLabels[option]}
          </Chip>
        ))}
      </div>
    </div>
  );
}

interface CuisineFiltersProps {
  value: Cuisine[];
  onChange: (value: Cuisine[]) => void;
}

/** Cuisine chips; they wrap onto as many lines as needed. */
export function CuisineFilters({ value, onChange }: CuisineFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="المطبخ">
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
  return filters.course.length > 0 || filters.time.length > 0 || filters.difficulty.length > 0 || filters.meal.length > 0;
}

export function countActiveFilters(filters: HomeFilters & { cuisine?: Cuisine[] }): number {
  return (
    filters.course.length + filters.time.length + filters.difficulty.length + filters.meal.length + (filters.cuisine?.length ?? 0)
  );
}
