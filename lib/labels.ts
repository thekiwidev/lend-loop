import type { Category } from "./toolIcons";

export type Condition = "new" | "good" | "fair" | "worn";

export const CATEGORY: Record<Category, { label: string; icon: string }> = {
  power: { label: "Power tools", icon: "power" },
  garden: { label: "Garden", icon: "garden" },
  kitchen: { label: "Kitchen", icon: "kitchen" },
  camping: { label: "Camping", icon: "camping" },
  other: { label: "Other", icon: "box" },
};

export const CATEGORIES = Object.keys(CATEGORY) as Category[];

export const CONDITION: Record<Condition, string> = { new: "New", good: "Good", fair: "Fair", worn: "Worn" };
