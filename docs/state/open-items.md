# Open Items

Remove an item when it is closed. Record the decision in the ADL if it was consequential.

## Pending decisions (Owner)

1. Bartender NC responsible-service certification: confirm the actual regulatory requirement.
2. Loosening per-manager suggestion review (deferred, not urgent).
3. Which role does the monthly cross-system item list in the POS Item Entry and Naming SOP.
4. Owner-tier deletes: empty "Hospitality Certification" module; empty Kitchen Day 3 modules; two old per-Location Facilities Walkthrough Guides.
5. Remove the legacy `path` text columns on `employees` and `modules` (touches `guard_auth_tier()`); currently left in place.

## Known bugs

- **Search misses block content.** `searchQueryOptions` matches step `title` and legacy `content_body` only, not `step_blocks`. Most current training content lives in blocks, so it cannot be found by text search. The Ask assistant's retrieval should be checked for the same gap.
- Trainee-facing copy still contains em dashes in places (for example the signed-out banner in `AppLayout.tsx`). Fix when those files are next touched.

## Needs verification by the Owner

- Stage 1 permissions and approvals browser test.
- Vercel sign-in end to end, including on a phone.
- Checklist scoping and server-graded quiz across tiers and Locations.
- Cross-training, Market Floor Safety, Outline tree, new-module Path dropdown: not yet click-tested.
- Reference section drag-to-reorder on an actual phone.

## Testing setup

- Skills test through `/preview` and the Owner "View as" switcher. Neither tests real RLS or saved progress for Staff. Planned: one Staff-tier test login per Division (email aliases such as `sven+kitchen@biggersmarket.com`), then add real-account checks to `post-build-audit` and `trainee-journey-check`.

## Technical debt (deliberately deferred)

- `docs/governance/Database Architecture.md` needs a full refresh against the live schema (Paths, Locations, cross-training, `day_position`, `step_blocks`).
- About 29 unindexed foreign keys (revisit before real scale).
- Overlapping permissive RLS policies on `employees` and `huddle_cards` (semantically distinct, not a bug).
- Leaked-password protection disabled (moot under passwordless sign-in).
- `fix_tcs_content.sql` in the repo root is already applied and redundant; safe to delete.
- Lovable asset files in `src/assets/*.asset.json` (cooler storage order images) conflict with the Supabase-only storage rule; move to Supabase Storage when touched.
- Retention-check scheduling not built.
- Policy acknowledgement as a distinct tracked object: not needed while the Handbook is paper.
