---
paths:
  - "src/routes/training-queue.tsx"
  - "src/routes/approvals.tsx"
  - "src/routes/team.tsx"
  - "src/routes/compliance.tsx"
  - "src/routes/assign-training.tsx"
  - "src/routes/huddle-notes.tsx"
  - "src/routes/delivery-issues.tsx"
  - "src/routes/merge-tool.tsx"
  - "src/routes/suggest.tsx"
  - "src/routes/admin.*.tsx"
  - "src/components/admin/**"
  - "src/components/manager/**"
  - "src/components/ViewAsBar.tsx"
---

# Manager and Admin Experience Rules

Applies to Manager, GM and Owner screens. Applies to all agents, including Lovable.

## Principles

- **Show what needs action, not raw data.** "Who needs me right now" outranks history. Training Queue's "Needs you" is the default framing; Compliance holds the backlog view.
- **Sign-off is fast.** A manager standing next to a trainee should be able to find them and sign off in as few taps as possible, on a phone. Do not add confirmation dialogs beyond the existing sign-off checklist gate.
- **Structural enforcement over memory.** If a manager must do something, it appears as a queued, per-employee item. Never a document that hopes to be found.
- **No notification feeds.** Do not add per-employee alerts, push notifications or activity feeds. Use queues and count badges (Approvals already has one).

## Permissions in the UI

- Show controls only to tiers that can use them, but never treat hiding as authorization. The database must reject the write too (`rls-change` skill).
- Owners have `department_scope = null` (unrestricted). Every Division filter must treat null-for-Owner as "all," never "none."
- GM scope is own Division plus own Location. Regular Managers suggest; they do not publish content.
- The Owner "View as" switcher is display only. Saves still run with Owner rights. Do not let it change what gets written.

## Layout

- Manager/Owner screens use `admin-dense` automatically via `AppLayout`. Keep it there; never on trainee screens.
- Still mobile-usable at 375px. Managers sign off and review on phones too. Tables collapse to cards or scroll inside their own container, never the page.
- Destructive or approval-requiring actions use the existing request/approve patterns (module delete request, section delete request, document delete request). Do not invent a new approval mechanism.

## Editing surfaces

- Training content is edited in place from `/preview` via the pencil (`StepEditPanel`) and in Outline (`/admin/content`). Both use the same shared panels. Never build a second editor for the same entity.
- New step content goes to `step_blocks` through `StepBlocksEditor`. The legacy content body field is not offered to Owner/GM on creation.
- Reordering uses the existing dnd-kit pattern from `SortableContentTree.tsx`.

## Copy

- Same rules as `AGENTS.md`: Division, role not names, plain English, no em dashes.
- Counts and statuses are explicit ("3 waiting for sign-off"), not vague ("Some items").
