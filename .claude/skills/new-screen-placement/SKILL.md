---
name: new-screen-placement
description: Use when a request would add a new route, page, top-level nav item, tab, or major dialog to the Biggers Training Platform. Decides whether it should exist and where it goes.
---

# New Screen Placement

Default answer: do not add a screen. Add to an existing one if it can carry the job.

## 1. Should this be a new screen?

Go down the list and stop at the first yes:

1. Can an existing screen show it with a section, tab, filter or collapsible? (Example: Assignable modules became a tile and sheet on `/preview`, not a new page.)
2. Can an existing sheet or dialog handle it in place? (Example: step editing happens in `StepEditPanel` from the pencil, not a separate route.)
3. Is it Owner-only and rare? Put it inside an existing admin screen.
4. Only if none fit: a new route.

## 2. Who sees it

- Staff: almost never add navigation for Staff. Their nav is Today, Search, Reference Guides, and Me in the account menu.
- Manager/GM/Owner: never a new top-level item without a stated reason. Use the Content dropdown (editing, previewing, approving content) or the Admin dropdown (people, assignments, operations).
- Personal views go in the account menu (like Me).

## 3. Wire it correctly

- Route file in `src/routes/` (TanStack file routing). Do not hand-edit `routeTree.gen.ts`.
- Add to `AppLayout.tsx` nav arrays for the right tiers, desktop and mobile both (they share the arrays).
- Manager/admin route: add its path to `isAdminScreen` so it gets `admin-dense`.
- Route guard in the UI, and RLS on every table it reads or writes (`rls-change` skill).
- Owner `department_scope = null` must see all Divisions.

## 4. Record it

- Update the navigation section in `.claude/rules/navigation.md` only if the request explicitly approved a navigation change.
- Add an ADL entry and update `docs/state/` (`update-governance` skill).
