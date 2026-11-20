"use client";

import { useId, useState } from "react";
import { CATEGORIES, CATEGORY } from "@/lib/labels";
import { suggestIcons, TOOL_ICONS, type Category } from "@/lib/toolIcons";
import { Button } from "./Button";
import { Icon } from "./Icon";

const LABEL = new Map(TOOL_ICONS.map((i) => [i.name, i.label]));

function Option({ group, name, checked, onChange }: { group: string; name: string; checked: boolean; onChange: (name: string) => void }) {
  return (
    <label className="ll-iconpicker__opt">
      <input type="radio" name={group} value={name} checked={checked} onChange={() => onChange(name)} />
      <Icon name={name} size={22} />
      {LABEL.get(name)}
    </label>
  );
}

/** Radio group of icons: suggestions from the tool name and category first, the full set on request. */
export function IconPicker({ toolName, category, value, onChange }: { toolName: string; category: Category; value: string; onChange: (name: string) => void }) {
  const group = useId();
  const [showAll, setShowAll] = useState(false);
  const suggested = suggestIcons(toolName, category);
  const shown = new Set(suggested);
  // A chosen icon from "More icons" stays visible after collapsing.
  if (value && !shown.has(value)) suggested.push(value);

  return (
    <fieldset className="ll-iconpicker">
      <legend className="ll-field__label">Icon</legend>
      <div className="ll-iconpicker__grid">
        {suggested.map((name) => (
          <Option key={name} group={group} name={name} checked={value === name} onChange={onChange} />
        ))}
      </div>
      {showAll
        ? CATEGORIES.map((c) => {
            const rest = TOOL_ICONS.filter((i) => i.category === c && !suggested.includes(i.name));
            if (!rest.length) return null;
            return (
              <div key={c}>
                <p className="ll-iconpicker__group caption">{CATEGORY[c].label}</p>
                <div className="ll-iconpicker__grid">
                  {rest.map((i) => (
                    <Option key={i.name} group={group} name={i.name} checked={value === i.name} onChange={onChange} />
                  ))}
                </div>
              </div>
            );
          })
        : null}
      <div>
        <Button variant="ghost" size="sm" iconRight={showAll ? undefined : "chevron-down"} onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
          {showAll ? "Fewer icons" : "More icons"}
        </Button>
      </div>
    </fieldset>
  );
}
