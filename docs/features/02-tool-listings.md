# 02 — Tool listings

**Status:** delivered · **Requirements:** FR-2, FR-3, FR-6 · **Stories:** US-10, US-11

## Goal

Let a neighbour list a tool in under a minute, and edit or remove only their own listings.

## Scope

- Fields: name (1–80 characters), category (power tools, garden, kitchen, camping, other), condition (new, good, fair, worn), short description (up to 500), icon.
- Icon catalogue (`lib/toolIcons.ts`) shared by the picker and the server, with keyword suggestions from the tool name and a category fallback.
- Create and edit in one `ToolForm` dialog; remove behind a confirmation dialog.
- Soft delete (`removedAt`) so loan history keeps its tool name.

## Rules

- Only the owner can edit or remove (`requireToolOwner`).
- Removal is refused while the tool has an approved loan.
- Pending requests on a removed tool are cancelled and each borrower is emailed.
- Inputs are trimmed and validated server-side; an icon outside the catalogue is refused.

## Plan

1. Add `tools` to the schema with `by_category` and `by_owner` indexes.
2. Write `tools.create`, `tools.update`, `tools.remove` with `cleanToolInput`.
3. Build the icon catalogue, glyphs (`lib/icons.ts`) and `IconPicker`.
4. Build `ToolForm` and the My listings page with edit and remove.

## Acceptance criteria

- Someone else's edit or removal fails with "Only the owner can change this listing."
- An 81-character name or an unknown icon is refused.
- Typing "cordless drill" suggests the drill icon first.

## Files

`convex/tools.ts`, `convex/schema.ts`, `lib/toolIcons.ts`, `lib/icons.ts`, `lib/labels.ts`, `components/ToolForm.tsx`, `components/IconPicker.tsx`, `components/ToolCard.tsx`, `app/(signed-in)/app/listings/page.tsx`

## Verification

`tests/access.test.ts` (tools block), `tests/toolIcons.test.ts`.
