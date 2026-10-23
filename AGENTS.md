<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Biggers Training Platform: Agent Instructions

These instructions apply to every agent working in this repo: the Lovable agent, Claude Code, and any other coding agent. Read this whole file before any change. It is the always-on layer. Detailed rules live in `.claude/rules/`, procedures in `.claude/skills/`, and the full source of truth in `docs/governance/`.

## What this app is

An internal training and operational-knowledge app for Biggers Market (Wilmington, NC): an open-air farm market (Market Division), a scratch kitchen (Kitchen Division), and Biggers Delivery. About 100 employees, mostly college-age and part-time, high turnover, using the app on their own phones. New hires must be productive inside a fixed 4-day onboarding window.

Stack: React + TanStack Router (`src/routes/`), Tailwind v4 + shadcn/ui, Supabase (project `kouyxrwnzjphuvnvxwyj`, never `htsqbaeubcmmvgbpjqig`), hosted on Vercel from this repo. Lovable is the editing layer only. The app must never depend on Lovable hosting or Lovable asset storage.

Users: Staff (trainees and floor staff), Manager, General Manager (a Manager with `can_manage_team = true`), Owner (Sven, Wells, Andrew).

## How to work

1. **Implement the spec, not your own product ideas.** Product, UX, permission and data decisions are made before a prompt reaches you. If the request is ambiguous or conflicts with these rules, say so and stop. Do not guess and do not redesign.
2. **Touch only what was asked.** Do not refactor, restyle, rename or "clean up" unrelated code. Protect working features.
3. **No database changes unless the request says so.** If a request does not mention schema, RLS, triggers or migrations, do not create any. If you believe one is required, say so instead of doing it.
4. **Reuse before you build.** Check `src/components/ui/` and the domain folders (`training/`, `admin/`, `manager/`, `reference/`, `sourcing/`) for an existing pattern first.
5. **Done means verified,** not "it renders." Check behavior, mobile layout, each permission tier, loading/empty/error states, and regressions. Use the `post-build-audit` skill after significant work.
6. **Keep the branch working.** Commits sync to Lovable and deploy to Vercel.

## Git workflow: branch first, main only on explicit instruction

Applies to every agent that commits from outside the Lovable editor (Claude Code, Cowork, any other coding agent).

1. **Never commit or push directly to `main`.** `main` is the Lovable-connected branch and deploys to Vercel.
2. **Start every task from a current `main`.** Run `git fetch origin`, then create a working branch from `origin/main` named `agent/<short-topic>` (lowercase, hyphens). Reuse an existing branch only when the request names it.
3. **Commit and push to the working branch** (`git push -u origin agent/<short-topic>`). Push after each meaningful commit so the work is never only on one machine.
4. **Stay up to date with `main`.** Before starting work on an existing branch, and again before asking to merge, run `git fetch origin` and `git merge origin/main` into the working branch. Resolve conflicts on the branch. Do not rebase or force-push a branch that is already pushed.
5. **Merge to `main` only when explicitly told to** in the current request (for example "merge to main" or "push to main"). Approval for one merge does not carry over to later work. Prefer a pull request merge (`gh pr create`, then `gh pr merge --merge`) so history stays readable.
6. **After a merge,** confirm `main` builds, then delete the working branch on the remote unless told to keep it.
7. **End of task report:** state the branch name, the commits pushed, and whether `main` is behind the branch.

## Decision priority

When tradeoffs conflict, rank in this order: 1 employee comprehension, 2 speed to finish the task, 3 clear primary action, 4 mobile usability, 5 operational reliability, 6 consistency, 7 maintainability, 8 admin efficiency, 9 visual polish, 10 novelty. Prefer the simplest thing that works. Do not add features because comparable platforms have them.

## Non-negotiable rules

Do not break these. If a request would, stop and name the conflict.

1. **Preview equals trainee view.** Owner/manager preview (`/preview`, `?preview=1`) renders exactly what a trainee sees, aside from legitimate admin controls (edit pencils, sign-off controls). Shared rendering goes through shared components (`ModuleHeader`, `StepRenderer`, `BlockRenderer`), never per-screen copies.
2. **One trainer stop per training day.** Exactly one `doing_signoff` or `supervised_live_practice` step per calendar training day. All self-paced content for the day comes before it.
3. **No hard deletes on content tables.** Soft delete (`is_deleted`, `deleted_by`, `deleted_at`) plus `version_history`. The only approved exceptions: `merge_employees()`, the 30-day Manager Notes purge, and permanently deleting an already-hidden step block.
4. **Never fabricate content.** `content_status` `missing`/`blocked` renders as visibly incomplete. Never pad with placeholder text, stock images or invented facts.
5. **Admin-only fields never reach trainees,** including in `/preview`: `content_notes`, `media_recommendation`, `media_recommendation_note`.
6. **RLS is the security boundary.** Hiding a button is not authorization. Every new writable feature needs its RLS policy or guard trigger checked directly. Use the `rls-change` skill.
7. **No critical learning path may depend on a manager remembering.** If a manager action is required, it shows up as a queued, per-employee item (Training Queue "Needs you").
8. **Do not add** a vendor directory, a per-employee notification/alert feed, or a Homebase sync. All three were proposed and rejected.
9. **Content grows without code.** New tracks, modules, steps and positions (`is_assignable` modules) are added in the app, not by code. Only a new content type, a new Division, or a new permission tier is a code/schema change, and should be named as one.
10. **New step content goes in `step_blocks`,** never `steps.content_body` (legacy). Always read `step_blocks` before concluding a step is empty.
11. **The Ask assistant never guesses.** Retrieval first, cited answers only, fixed fallback when nothing matches. Search excludes `missing`/`blocked` content and stays RLS-scoped.
12. **Files live in Supabase Storage.** Images, PDFs and other files go to Supabase Storage (`reference-photos`, `brand-assets`). Never use Lovable asset storage (`src/assets/*.asset.json`, `/__l5e/` URLs). Videos are YouTube embeds via `VideoEmbed`.
13. **iPhone photos:** never store raw HEIC; convert to JPEG client-side (native decode, then `heic-to`). Never reintroduce `heic2any`.

## Permissions (current)

| Action | Staff | Manager | GM (own Division) | Owner |
|---|---|---|---|---|
| Complete own training, suggest a change | Yes | Yes | Yes | Yes |
| Sign off trainer steps | No | Own Division/Location; any Universal step | Same as Manager | Any |
| Create or reorder sections/modules/steps | No | Suggest only | Direct | Direct |
| Edit training content | No | Suggest only | Direct | Direct |
| Edit Checklists/SOPs/Manager Guides | No | Suggest only | Direct | Direct |
| Create a new Checklist/SOP, delete a document or module | No | No | Request only | Direct |
| Delete a section (track) | No | No | Request, Owner approves | Direct |
| Quiz questions, assign `is_assignable` modules | No | Read only | Direct | Direct |
| Review suggestions (`/approvals`) | No | No | Their Division's items | All |
| Sourcing Board, Manager Notes, Delivery Issues | Report issues only | Direct | Direct | Direct |
| Team tier/status, remove/restore people | No | No | Staff/Manager, own Division+Location | Anyone but self |
| Merge accounts, `/admin/gaps` | No | No | No | Yes |

Owners have `department_scope = null`. That means unrestricted, not unset. Approvals never write step content from a suggestion; the reviewer edits the step in the real editor. Full matrix: `docs/governance/Roles and Permissions.md`.

## Words and copy

- **Division**, never "Department," in any UI text or content (Universal, Market, Kitchen, Delivery). "Department" is reserved for a future sub-area of a store. The database still uses `department`/`department_scope`; do not rename columns.
- Other fixed terms: **Location** (Market Street, Carolina Beach Road), **Path** (Kitchen sub-path: Production / Service), **Section** (a track), **Module**, **Step**, **Day** (1 to 4), **Trainer stop**, **Sign-off**, **Suggest a change**.
- Refer to people by **role, never by name** ("a manager on duty," "the Kitchen Operations Manager").
- Plain English at roughly a 6th to 8th grade reading level. Short sentences. Second person ("you"). Spell out every abbreviation on first use.
- **No em dashes** anywhere in UI copy, content, or docs. Use a period, comma, colon or parentheses.
- Error messages say what happened and what to do next. No blame, no codes alone.

## Context rules and skills

Before editing files in these areas, read the matching rule file. (Claude Code loads these automatically by path. Lovable: open and read the file yourself.)

| If you are changing... | Read first |
|---|---|
| Trainee screens: `src/routes/index.tsx`, `modules.$moduleId.tsx`, `training-library.tsx`, `me.tsx`, `search.tsx`, `login.tsx`, `reference*.tsx`, `src/components/training/**`, `src/components/reference/**` | `.claude/rules/employee-experience.md` |
| Manager/admin screens: `training-queue`, `approvals`, `team`, `compliance`, `assign-training`, `huddle-notes`, `delivery-issues`, `merge-tool`, `admin.*`, `src/components/admin/**`, `src/components/manager/**` | `.claude/rules/manager-experience.md` |
| Step/module rendering, `/preview`, `TraineeWalk`, `StepRenderer`, `BlockRenderer`, `ModuleHeader`, `training.queries.ts`, `preview.queries.ts` | `.claude/rules/training-rendering.md` |
| Styling, `src/styles.css`, any component markup | `.claude/rules/design-system.md` |
| Routes, nav, `AppLayout.tsx`, `__root.tsx` | `.claude/rules/navigation.md` |
| `supabase/**`, migrations, RLS, triggers, `src/integrations/supabase/**`, `*.queries.ts` writes | `.claude/rules/database.md` |

Skills (procedures, in `.claude/skills/`, also installed as Lovable workspace skills):

| Skill | Use when |
|---|---|
| `feature-spec` | Any new feature or behavior change |
| `rls-change` | Any RLS policy, trigger, function grant or permission change |
| `post-build-audit` | After any significant build |
| `ux-screen-review` | Before shipping a new or changed trainee or manager screen |
| `trainee-journey-check` | After changing day, order, module structure or plan logic |
| `new-screen-placement` | Adding a route or screen |
| `add-step-block-type` | Adding a `step_blocks` block type |
| `training-content-authoring` | Writing training content directly in Supabase |
| `update-governance` | End of any task that changed behavior, rules or build state |

## Governance and state docs

- `docs/governance/`: Product Constitution, Information Architecture, Database Architecture, Roles and Permissions, Design System, Training Architecture, Architecture Decision Log. These are the source of truth. If code and docs disagree, flag it; do not silently pick one.
- `docs/state/`: current build state. `README.md` is the short index; one file per area.

Editing these docs (both Lovable and Claude Code may):

- **Freely:** update `docs/state/*` to reflect what you built, and append new ADL entries (next number, existing format).
- **Only when the request explicitly says so:** change a rule in this file or `.claude/rules/`, change a non-negotiable, change the permissions matrix, or edit an existing ADL entry.
- Never rewrite a rule to match code you just wrote. If code needs a rule to change, say so and stop.
- Keep state files describing the present, not history. History belongs in the ADL.
