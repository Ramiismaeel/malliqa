import { z } from "zod";

export const capabilitySchema = z.enum([
  "stovetop",
  "oven",
  "microwave",
  "air-fryer",
  "blender",
  "hand-mixer",
  "stand-mixer",
  "food-processor",
  "meat-grinder",
  "pressure-cooker",
  "grill",
]);

export const equipmentCategorySchema = z.enum(["cooking", "baking", "electric", "other"]);

export const equipmentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  emoji: z.string().min(1).max(8).optional(),
  category: equipmentCategorySchema,
  provides: z.array(capabilitySchema).min(1),
});

export type Capability = z.infer<typeof capabilitySchema>;
export type EquipmentCategory = z.infer<typeof equipmentCategorySchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
