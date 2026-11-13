import type { Capability } from "@/lib/schemas/equipment";
import type { AdvancePrep, Cuisine, Difficulty, MealType, Unit } from "@/lib/schemas/recipe";
import type { MatchStatus } from "@/lib/matching/matchRecipes";
import type { TimeBucket } from "@/lib/matching/timeBucket";

// Arabic display labels for enum values. UI text lives outside
// `src/lib/matching` on purpose.

export const cuisineLabels: Record<Cuisine, { label: string; emoji: string }> = {
  syrian: { label: "سوري", emoji: "🫒" },
  levantine: { label: "شامي", emoji: "🧆" },
  arab: { label: "عربي", emoji: "🐪" },
  italian: { label: "إيطالي", emoji: "🍝" },
  asian: { label: "آسيوي", emoji: "🍜" },
  quick: { label: "سريع وخفيف", emoji: "⚡" },
  bakery: { label: "معجنات وحلويات", emoji: "🥐" },
  other: { label: "متنوع", emoji: "🍽️" },
};

export const mealTypeLabels: Record<MealType, { label: string; emoji: string }> = {
  meat: { label: "لحوم", emoji: "🥩" },
  chicken: { label: "دجاج", emoji: "🍗" },
  fish: { label: "سمك", emoji: "🐟" },
  vegetarian: { label: "نباتي", emoji: "🥚" },
  vegan: { label: "صيامي", emoji: "🌱" },
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "سهلة",
  medium: "متوسطة",
  hard: "صعبة",
};

export const timeBucketLabels: Record<TimeBucket, { label: string; hint: string }> = {
  quick: { label: "سريعة", hint: "حتى 30 دقيقة" },
  medium: { label: "متوسطة", hint: "31–60 دقيقة" },
  long: { label: "طويلة", hint: "أكثر من ساعة" },
};

export const statusLabels: Record<MatchStatus, string> = {
  ready: "جاهزة الآن",
  almost: "ينقصها شيء بسيط",
  shopping: "تحتاج تسوّق",
  unsuitable: "غير مناسبة لأدواتك",
};

export const capabilityLabels: Record<Capability, string> = {
  stovetop: "غاز / طباخ",
  oven: "فرن",
  microwave: "مايكروويف",
  "air-fryer": "قلاية هوائية",
  blender: "خلاط",
  "hand-mixer": "خفاقة",
  "stand-mixer": "عجانة",
  "food-processor": "محضّرة طعام",
  "pressure-cooker": "طنجرة ضغط",
  grill: "شواية",
};

export const unitLabels: Record<Unit, string> = {
  g: "غ",
  kg: "كغ",
  ml: "مل",
  l: "ل",
  tsp: "ملعقة صغيرة",
  tbsp: "ملعقة كبيرة",
  cup: "كوب",
  piece: "حبة",
  pinch: "رشة",
  "to-taste": "حسب الرغبة",
};

export const advancePrepLabels: Record<AdvancePrep["kind"], { label: string; emoji: string }> = {
  soak: { label: "نقع", emoji: "💧" },
  marinate: { label: "تتبيل", emoji: "🧄" },
  rise: { label: "تخمير", emoji: "🫧" },
  chill: { label: "تبريد", emoji: "❄️" },
};
