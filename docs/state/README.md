# Current Build State: Index

Read this file first. Open an area file only when your task touches that area. Each area file describes what is live now, not history (history is in `docs/governance/Architecture Decision Log.md`).

Last full refresh: 2026-10-23, split from the old single `Current Build State.md`.

| Area | Status | File |
|---|---|---|
| Sign-in, hosting, email | Live on Vercel and Lovable. Vercel sign-in test and URL cleanup open | `auth-hosting.md` |
| Team and permissions | Stage 1 permissions built, Owner browser test pending. Remove Team Member UI not built | `team-permissions.md` |
| Universal Day 1 | Live. Welcome video and two Hospitality media steps still missing | `training-universal.md` |
| Kitchen Days 1 to 4 | Live, both Paths. A few photos and two empty modules open | `training-kitchen.md` |
| Market Days 1 to 4 | Day 1 and 2 mostly live. Day 3 partly missing, Day 4 not built | `training-market.md` |
| Delivery | Day 1 placeholder only. Deferred by design | `training-market.md` (Delivery section) |
| Reference Guides | Live: Sourcing, Checklists, SOPs, Portioning & Presentation, Manager Guides | `reference-library.md` |
| Content editing and approvals | Live: block editor, Outline, preview pencil, Suggest a change, Approvals | `content-editing-approvals.md` |
| Operations tools | Live: Training Queue, Compliance, Assign Training, Huddle & Notes, Delivery Issues, Search, Ask | `operations.md` |
| Open items | Pending decisions, known bugs, UX issues, technical debt | `open-items.md` |

## Top open items

1. Owner browser test of Stage 1 permissions and approvals (ADL-103).
2. Vercel end-to-end sign-in test; pick one staff-facing address (ADL-104).
3. Remove Team Member UI (ADL-105, database already live).
4. Search does not look inside `step_blocks`, so most current training content is not searchable (see `open-items.md`).
5. Market Days 3 to 4 content.
