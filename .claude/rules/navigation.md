---
paths:
  - "src/routes/**"
  - "src/components/AppLayout.tsx"
  - "src/router.tsx"
---

# Navigation Rules

Applies to all agents, including Lovable. Full detail: `docs/governance/Information Architecture.md`.

## Current structure

All nav lives in `src/components/AppLayout.tsx`.

- **Everyone:** Today (`/`), Search (`/search`), Reference Guides (`/reference/*`: Sourcing, Checklists, SOPs, Portioning & Presentation, Manager Guides tabs). Account menu holds Me (`/me`) and Sign out.
- **Manager/GM/Owner:** Training Queue (top level).
- **Content dropdown:** Approvals (Owner, GM, with count badge), Content (`/admin/content`), Preview Training (`/preview`), Gaps (`/admin/gaps`, Owner only).
- **Admin dropdown:** Owner: Team, Huddle & Notes, Delivery Issues, Compliance, Assign Training, Locations & Paths, Merge. GM: Team, Huddle & Notes, Delivery Issues, Assign Training. Manager: Huddle & Notes, Delivery Issues, Assign Training.
- Mobile (below `md`): slide-out sheet with the same grouping as desktop.
- A new manager/admin route must be added to the `isAdminScreen` list in `AppLayout.tsx` so it gets `admin-dense` and the wide layout. Trainee routes must not be added there.
- `/suggest` is retired from navigation (replaced by "Suggest a change" on each step). Do not re-add it.

## Rules

- **No 7th top-level item** for managers without a stated reason. New manager/owner screens go into the Content or Admin dropdown, or the account menu.
- Staff navigation stays minimal. Do not add top-level items for staff without a spec that says so.
- A new screen must have a reason to exist. Prefer adding to an existing screen, tab or sheet. Use the `new-screen-placement` skill.
- Route guards in the UI are convenience. The data behind every guarded route must also be protected by RLS.
- Deep links must keep working: step-level links into `/preview` and Outline auto-expand to the target, then respect manual collapse.
- `src/routeTree.gen.ts` is generated. Do not hand-edit it.
- Do not mirror the Google Drive folder structure in navigation. Drive is a source repository, not the app's information architecture.
