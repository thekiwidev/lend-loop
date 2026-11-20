"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { CATEGORIES, CATEGORY, CONDITION, type Condition } from "@/lib/labels";
import { suggestIcons, type Category } from "@/lib/toolIcons";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { IconPicker } from "./IconPicker";
import { Select } from "./Select";
import { TextField } from "./TextField";

export interface EditableTool {
  _id: Id<"tools">;
  name: string;
  category: Category;
  condition: Condition;
  icon: string;
  description: string;
}

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY[c].label }));
const CONDITION_OPTIONS = (Object.keys(CONDITION) as Condition[]).map((c) => ({ value: c, label: CONDITION[c] }));

/** Create or edit a listing. Until the owner picks an icon, it follows the top suggestion. */
export function ToolForm({ open, tool, onClose }: { open: boolean; tool?: EditableTool; onClose: () => void }) {
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const [name, setName] = useState(tool?.name ?? "");
  const [category, setCategory] = useState<Category>(tool?.category ?? "power");
  const [condition, setCondition] = useState<Condition>(tool?.condition ?? "good");
  const [description, setDescription] = useState(tool?.description ?? "");
  const [pickedIcon, setPickedIcon] = useState<string | null>(tool?.icon ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const icon = pickedIcon ?? suggestIcons(name, category)[0];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Give the tool a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = { name, category, condition, icon, description };
      if (tool) await update({ toolId: tool._id, ...fields });
      else await create(fields);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tool ? `Edit ${tool.name}` : "List a tool"}
      description={tool ? undefined : "Neighbours see the name, category, condition and your first and last name."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="tool-form" loading={saving}>
            {tool ? "Save changes" : "List tool"}
          </Button>
        </>
      }
    >
      <form id="tool-form" className="ll-form" onSubmit={submit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <TextField
          label="Name"
          value={name}
          maxLength={80}
          required
          placeholder="Cordless drill"
          error={nameError}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
        />
        <div className="ll-form__row">
          <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={(e) => setCategory(e.target.value as Category)} />
          <Select label="Condition" value={condition} options={CONDITION_OPTIONS} onChange={(e) => setCondition(e.target.value as Condition)} />
        </div>
        <IconPicker toolName={name} category={category} value={icon} onChange={setPickedIcon} />
        <TextField
          multiline
          label="Description"
          optional
          rows={3}
          maxLength={500}
          hint={`${description.length}/500. What's included, anything to know before borrowing.`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </form>
    </Dialog>
  );
}
