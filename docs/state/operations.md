# Operations Tools

## Live

- **Today (`/`):** Staff see "up next" and progress. Managers and Owners see the Manager Daily Brief: today's Huddle Card, Manager Notes for today, and items assigned to them.
- **Training Queue (`/training-queue`):** "Needs you" vs. self-paced, Division-scoped for managers, all Divisions for Owners. Inline sign-off with the checklist gate and optional trainer handoff notes (shown as a chip by day).
- **Compliance (`/compliance`):** assignable-module completion and an Owner-only overdue sign-off backlog (48 hours+).
- **Assign Training (`/assign-training`):** browse `is_assignable` modules by Division and category, assign with an optional due date, end assignments. GM and Owner act; Managers read only.
- **Huddle & Notes (`/huddle-notes`):** Owners manage Huddle Cards; Managers, GMs and Owners manage Manager Notes. Huddle Cards rotate daily by day of year per Division. Soft-deleted Manager Notes are purged after 30 days.
- **Delivery Issues:** anyone reports (two photos, truck date); routed to a chosen manager or owner; company-wide list with Resolve at `/delivery-issues`.
- **Me (`/me`):** personal progress across tracks, from the account menu.
- **Search (`/search`):** keyword search across modules, steps, sourcing, reference documents and portioning; excludes `missing`/`blocked`; RLS-scoped.
- **Ask assistant:** grounded answers with citations and a fixed "check with a manager" fallback.
- **Mascot slots** wired to the `brand-assets` bucket; no artwork uploaded yet.

## Open

- Day-7 and day-30 retention quizzes designed, scheduling not built.
- Pending Sourcing Board removal requests appear only on `/approvals`, not on the Daily Brief (not requested).
