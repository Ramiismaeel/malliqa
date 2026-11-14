import {
  Blend,
  CookingPot,
  Flame,
  Microwave,
  Utensils,
  Wind,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { FoodProcessorIcon } from "@/components/ui/food-processor-icon";
import { MeatGrinderIcon } from "@/components/ui/meat-grinder-icon";
import { capabilityLabels } from "@/lib/labels";
import type { Capability } from "@/lib/schemas/equipment";
import type { Recipe } from "@/lib/schemas/recipe";

/** Lucide has no oven, so this one is drawn in the same stroke style. */
function OvenIcon(props: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(props as React.SVGProps<SVGSVGElement>)}
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M3 8.500h18" />
      <path d="M7 5.800h.01M10.500 5.800h.01" />
      <rect x="6.500" y="11.500" width="11" height="6" rx="1.200" />
    </svg>
  );
}

const ICONS: Record<Capability, LucideIcon | typeof OvenIcon | typeof FoodProcessorIcon | typeof MeatGrinderIcon> = {
  stovetop: Flame,
  oven: OvenIcon,
  microwave: Microwave,
  "air-fryer": Wind,
  blender: Blend,
  "hand-mixer": Zap,
  "stand-mixer": Zap,
  "food-processor": FoodProcessorIcon,
  "meat-grinder": MeatGrinderIcon,
  "pressure-cooker": CookingPot,
  grill: Utensils,
};

export function CapabilityIcon({ cap, className }: { cap: Capability; className?: string }) {
  const Icon = ICONS[cap];
  return <Icon className={className} aria-hidden="true" />;
}

interface EquipmentIconsProps {
  equipment: Recipe["equipment"];
  missing?: readonly Capability[];
}

/** Compact row of required-equipment icons for recipe cards. */
export function EquipmentIcons({ equipment, missing = [] }: EquipmentIconsProps) {
  const required = equipment.filter((item) => item.role === "required");
  if (required.length === 0) {
    return <span className="text-xs text-base-content/65">بلا طبخ</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      {required.map((item) => (
        <span
          key={item.cap}
          title={capabilityLabels[item.cap]}
          className={missing.includes(item.cap) ? "text-error" : "text-base-content/65"}
        >
          <CapabilityIcon cap={item.cap} className="size-4" />
          <span className="sr-only">{capabilityLabels[item.cap]}</span>
        </span>
      ))}
    </span>
  );
}

interface EquipmentBadgesProps {
  equipment: Recipe["equipment"];
  /** Capabilities the kitchen has; `undefined` hides the ✓/✗ state. */
  capabilities?: ReadonlySet<Capability>;
}

/** Labeled equipment badges for the recipe detail page. */
export function EquipmentBadges({ equipment, capabilities }: EquipmentBadgesProps) {
  if (equipment.length === 0) {
    return <p className="text-sm text-base-content/65">لا تحتاج أي أدوات طبخ.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {equipment.map((item) => {
        const has = capabilities?.has(item.cap);
        const optional = item.role === "optional";
        const tone =
          has === undefined || has
            ? "border-base-content/10 bg-base-100"
            : optional
              ? "border-dashed border-base-content/20 bg-base-100/60 text-base-content/65"
              : "border-error/40 bg-error/10 text-error";
        return (
          <li key={`${item.cap}-${item.role}`} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium ${tone}`}>
            <CapabilityIcon cap={item.cap} className="size-4" />
            {capabilityLabels[item.cap]}
            {optional && <span className="text-xs font-normal opacity-70">(اختياري)</span>}
            {has === false && !optional && <span className="text-xs font-normal">غير متوفر</span>}
          </li>
        );
      })}
    </ul>
  );
}
