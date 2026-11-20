import { describe, expect, it } from "vitest";
import { CATEGORY_DEFAULT_ICON, isToolIcon, suggestIcons, TOOL_ICONS } from "../lib/toolIcons";
import { GLYPHS } from "../lib/icons";

describe("suggestIcons", () => {
  it("puts the drill first for a cordless drill", () => {
    expect(suggestIcons("cordless drill", "power")[0]).toBe("drill");
  });

  it("matches plurals", () => {
    expect(suggestIcons("Garden shears", "garden")[0]).toBe("hedge-trimmer");
    expect(suggestIcons("Two ladders", "other")[0]).toBe("ladder");
  });

  it("falls back to the category when the name is unknown", () => {
    const icons = suggestIcons("thingamajig", "camping");
    expect(icons.every((name) => TOOL_ICONS.find((i) => i.name === name)?.category === "camping")).toBe(true);
    expect(icons).toContain(CATEGORY_DEFAULT_ICON.camping);
  });

  it("returns at most six unique names", () => {
    const icons = suggestIcons("pot pan cake tin mixer blender slow cooker", "kitchen");
    expect(icons.length).toBeLessThanOrEqual(6);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe("catalogue", () => {
  it("has a glyph for every icon", () => {
    for (const icon of TOOL_ICONS) expect(GLYPHS[icon.name], icon.name).toBeDefined();
  });

  it("rejects names outside the catalogue", () => {
    expect(isToolIcon("drill")).toBe(true);
    expect(isToolIcon("<script>")).toBe(false);
  });
});
