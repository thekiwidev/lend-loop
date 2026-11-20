// Tool icon catalogue, shared by the IconPicker (suggestions) and Convex (validation).
// Glyph paths live in lib/icons.ts under the same names.

export type Category = "power" | "garden" | "kitchen" | "camping" | "other";

export interface ToolIcon {
  name: string;
  label: string;
  category: Category;
  keywords: readonly string[];
}

export const CATEGORY_DEFAULT_ICON: Record<Category, string> = {
  power: "power",
  garden: "garden",
  kitchen: "kitchen",
  camping: "camping",
  other: "box",
};

export const TOOL_ICONS: readonly ToolIcon[] = [
  { name: "power", label: "Power tool", category: "power", keywords: ["power", "electric", "cordless"] },
  { name: "drill", label: "Drill", category: "power", keywords: ["drill", "driver", "impact", "hammer drill", "bit"] },
  { name: "saw", label: "Saw", category: "power", keywords: ["saw", "circular", "jigsaw", "mitre", "miter", "handsaw"] },
  { name: "sander", label: "Sander", category: "power", keywords: ["sander", "sanding", "orbital", "polisher"] },
  { name: "pressure-washer", label: "Pressure washer", category: "power", keywords: ["pressure", "washer", "jet", "karcher"] },
  { name: "hammer", label: "Hammer", category: "other", keywords: ["hammer", "mallet", "sledgehammer"] },
  { name: "screwdriver", label: "Screwdriver", category: "other", keywords: ["screwdriver", "screw", "phillips"] },
  { name: "wrench", label: "Spanner", category: "other", keywords: ["wrench", "spanner", "socket", "ratchet"] },
  { name: "ladder", label: "Ladder", category: "other", keywords: ["ladder", "step", "steps", "stepladder"] },
  { name: "toolbox", label: "Toolbox", category: "other", keywords: ["toolbox", "kit", "set", "case"] },
  { name: "tape-measure", label: "Tape measure", category: "other", keywords: ["tape", "measure", "level", "ruler"] },
  { name: "box", label: "Other", category: "other", keywords: ["box", "other"] },
  { name: "garden", label: "Garden", category: "garden", keywords: ["garden", "plant", "seed"] },
  { name: "lawn-mower", label: "Lawn mower", category: "garden", keywords: ["mower", "lawnmower", "lawn", "grass", "strimmer"] },
  { name: "shovel", label: "Shovel", category: "garden", keywords: ["shovel", "spade", "dig", "trowel"] },
  { name: "rake", label: "Rake", category: "garden", keywords: ["rake", "leaf", "leaves"] },
  { name: "hose", label: "Hose", category: "garden", keywords: ["hose", "hosepipe", "sprinkler"] },
  { name: "wheelbarrow", label: "Wheelbarrow", category: "garden", keywords: ["wheelbarrow", "barrow", "cart"] },
  { name: "hedge-trimmer", label: "Hedge trimmer", category: "garden", keywords: ["hedge", "trimmer", "shears", "pruner", "loppers"] },
  { name: "watering-can", label: "Watering can", category: "garden", keywords: ["watering", "can"] },
  { name: "kitchen", label: "Kitchen", category: "kitchen", keywords: ["kitchen", "cook", "cooking"] },
  { name: "mixer", label: "Stand mixer", category: "kitchen", keywords: ["mixer", "kitchenaid", "whisk", "dough"] },
  { name: "blender", label: "Blender", category: "kitchen", keywords: ["blender", "smoothie", "juicer", "processor"] },
  { name: "pot", label: "Pot", category: "kitchen", keywords: ["pot", "stockpot", "saucepan", "casserole"] },
  { name: "pan", label: "Pan", category: "kitchen", keywords: ["pan", "frying", "skillet", "wok", "paella"] },
  { name: "cake-tin", label: "Cake tin", category: "kitchen", keywords: ["cake", "tin", "baking", "bake", "mould"] },
  { name: "slow-cooker", label: "Slow cooker", category: "kitchen", keywords: ["slow", "cooker", "crockpot", "rice", "pressure cooker"] },
  { name: "camping", label: "Camping", category: "camping", keywords: ["camping", "outdoor"] },
  { name: "tent", label: "Tent", category: "camping", keywords: ["tent", "gazebo", "shelter", "canopy"] },
  { name: "lantern", label: "Lantern", category: "camping", keywords: ["lantern", "lamp", "torch", "light", "headlamp"] },
  { name: "sleeping-bag", label: "Sleeping bag", category: "camping", keywords: ["sleeping", "bag", "mat", "airbed"] },
  { name: "cooler", label: "Cool box", category: "camping", keywords: ["cooler", "coolbox", "cool", "icebox"] },
  { name: "camp-stove", label: "Camp stove", category: "camping", keywords: ["stove", "burner", "gas", "bbq", "barbecue", "grill"] },
  { name: "backpack", label: "Backpack", category: "camping", keywords: ["backpack", "rucksack", "pack"] },
];

export const TOOL_ICON_NAMES: ReadonlySet<string> = new Set(TOOL_ICONS.map((i) => i.name));

export function isToolIcon(name: string): boolean {
  return TOOL_ICON_NAMES.has(name);
}

const MAX_SUGGESTIONS = 6;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "drills" matches "drill", "boxes" matches "box". */
function singular(word: string): string {
  if (word.endsWith("es") && /(x|sh|ch|s)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

const GENERIC_ICONS = new Set(Object.values(CATEGORY_DEFAULT_ICON));

function nameScore(icon: ToolIcon, typed: readonly string[]): number {
  const text = typed.join(" ");
  // A specific glyph ("drill") outranks a category glyph ("power") matched by "cordless".
  const weight = GENERIC_ICONS.has(icon.name) ? 1 : 2;
  let score = 0;
  for (const keyword of icon.keywords) {
    if (keyword.includes(" ")) {
      if (text.includes(keyword)) score += weight + 1;
    } else if (typed.includes(keyword)) {
      score += weight;
    }
  }
  return score;
}

/**
 * Up to six icon names for a tool: keyword matches on the typed name first,
 * then the category's icons, then the category default.
 */
export function suggestIcons(toolName: string, category: Category): string[] {
  const raw = words(toolName);
  const typed = [...new Set([...raw, ...raw.map(singular)])];
  const byName = TOOL_ICONS.map((icon) => ({ icon, score: nameScore(icon, typed) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.icon.category === category) - Number(a.icon.category === category))
    .map((s) => s.icon.name);
  const fromCategory = TOOL_ICONS.filter((i) => i.category === category).map((i) => i.name);
  const ordered = [...byName, ...fromCategory, CATEGORY_DEFAULT_ICON[category]];
  return [...new Set(ordered)].slice(0, MAX_SUGGESTIONS);
}
