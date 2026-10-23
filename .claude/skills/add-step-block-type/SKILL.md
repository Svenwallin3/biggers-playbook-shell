---
name: add-step-block-type
description: Use when adding a new step_blocks block type (a new kind of content box in training steps) to the Biggers Training Platform. Keeps the database CHECK constraint, editor, renderer and preview in lockstep.
---

# Add a Step Block Type

`step_blocks.block_type` is enforced by a Postgres CHECK constraint. If the frontend adds a type the constraint does not allow, saves fail. If the constraint allows a type the renderer does not know, content silently renders nothing. All of these change together, in one pass.

Current types: `heading`, `paragraph`, `list`, `photo`, `gallery`, `video`, `label_value`, `danger_zone`. Confirm against the live constraint before starting.

## 0. Is a new type needed?

Most needs fit an existing type: a callout is a `heading` plus `paragraph`; a comparison is `label_value`; steps are a numbered `list`. Only add a type when the content truly cannot be expressed with the existing ones. Name the case.

## 1. Inspect

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.step_blocks'::regclass and contype = 'c';
```

Find the frontend union and every switch on `block_type`:

- `src/components/admin/StepBlocksEditor.tsx` (type union, add menu, per-type editor)
- `src/components/training/BlockRenderer.tsx` (`renderBlock` switch)
- any search/Ask retrieval that reads block text (`src/lib/ask.retrieval.ts`, search route)

## 2. Change, all in one pass

1. **Migration:** drop and recreate the CHECK constraint with the new value added. Do not change existing values.
2. **Editor:** add the type to the union, the add-block menu, and its editor fields. Payload shape documented in a comment.
3. **Renderer:** add a `case` in `BlockRenderer`. Use brand tokens and existing components. Must look right at 375px.
4. **Search/Ask:** if the block has text, include it in retrieval so search and Ask can find it.
5. **Preview parity:** confirm `/preview` and `/modules/$moduleId` both render it via `BlockRenderer` (no per-screen code).

## 3. Verify

- Create a block of the new type on a test step, save, reload, confirm it renders in both views.
- Confirm an existing step of every old type still renders.
- Run `post-build-audit`.

## 4. Record

- Update the block type list in `.claude/rules/training-rendering.md` and this skill (this is an approved rule change when the request asked for the new type).
- ADL entry plus `docs/state/content-editing-approvals.md`.
