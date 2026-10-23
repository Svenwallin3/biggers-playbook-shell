---
name: feature-spec
description: Use when asked to build a new feature or change app behavior in the Biggers Training Platform. Turns a request into a decided, written spec before any code. Not for pure content edits or one-line bug fixes.
---

# Feature Spec: Diagnose, Decide, Specify, Implement, Audit

Product decisions happen before code. Follow these stages in order. If you are the Lovable agent and the prompt already contains a full spec, skip to Implement, but still run the Diagnose checks to catch conflicts.

## 1. Diagnose

Answer in a few lines each:

1. **Outcome:** what business result is this for? Who uses it (Staff, Manager, GM, Owner) and how often?
2. **Does this need code at all?** Can the existing app already do it (Outline, `/preview` pencil, Assign Training, Huddle & Notes, Reference editors)? Can it be done as content or data instead? If yes, stop and say so.
3. **Existing pattern:** which existing screen, component or flow is closest? (`src/components/ui/`, `training/`, `admin/`, `manager/`, `reference/`.)
4. **Local or systemic?** If several bugs share one cause, fix the cause.
5. **Database impact:** is a schema, RLS or trigger change truly required, or can existing tables and policies serve it?
6. **Conflicts:** does it touch any non-negotiable in `AGENTS.md`? If yes, stop and name the conflict.

## 2. Decide

- Pick one approach. Do not present a menu of options unless the choice is a business decision only the Owner can make (cost, policy, who gets access).
- Prefer the smallest change that fully solves the outcome. Reject extra features.

## 3. Specify

Write the spec with these headings (omit any that truly don't apply):

- **Objective:** one sentence.
- **Exact change:** screens, components, behaviors.
- **Reuse:** components and patterns to use.
- **Behavior:** step by step, including loading, empty, error and failed-save states.
- **Data:** tables and columns read or written.
- **Permissions:** per tier (Staff, Manager, GM, Owner) and how the database enforces it.
- **Mobile:** what it looks like and how it works at 375px.
- **Copy:** exact labels and messages (Division, role not names, no em dashes).
- **Must not change:** list the neighboring features to leave alone.
- **Database:** either the exact migration, or the line: "No database changes. Do not modify the existing Supabase schema."
- **Acceptance criteria:** checkable statements.

Large changes are split into staged, checkpointed passes. Never one mega-change.

## 4. Implement

- Follow the spec exactly. Touch only listed files and behaviors.
- Read the matching `.claude/rules/` file for every area you edit.
- If a permission change is involved, run the `rls-change` skill.

## 5. Audit

- Run `post-build-audit`.
- Run `ux-screen-review` for any new or changed screen.
- Run `trainee-journey-check` if plan, day or ordering logic changed.
- Run `update-governance`.
