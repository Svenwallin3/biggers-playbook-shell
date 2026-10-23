# Team and Permissions

The current permissions table is in `AGENTS.md`. Full matrix and reasoning: `docs/governance/Roles and Permissions.md`.

## Live

- **Four access levels:** Staff, Manager, General Manager (`can_manage_team = true` on a Manager), Owner.
- **Stage 1 permissions and approvals (ADL-103, built 2026-09-24):** only Owners and GMs (own Division) create or reorder sections, modules and steps; a GM deleting a section goes to Owner approval (`guard_track_delete()`); a "Suggest a change" button on every step replaces the old Flag and `/suggest`; suggestions route to the GM of the Division that owns the content, plus Owners; Approvals never writes step content from a suggestion; count badge on Approvals. **Owner browser test pending.**
- **Owner "View as" switcher** (display only; saves still use Owner rights).
- **Team screen (`/team`):** click-to-sort on every column. Owners control tier, status, Division, Location and GM flag. GMs promote/demote Staff and Manager and toggle active/inactive within their own Division and Location.
- **Remove and restore team member, database half (ADL-105):** enforced in `guard_auth_tier()`; self-removal and self-restore blocked. The GM location type bug that broke every GM edit on `/team` is fixed.
- **Employee self-update lockdown (ADL-098):** employees cannot change their own Division, Location, status or tier.
- **Cross-training (ADL-097):** GM/Owner add extra Divisions on `/team`; stored in `employee_secondary_divisions` with its own `path_id`. Sign-off authorization follows the step's Division.
- **Deactivation** (`status = inactive`) revokes all access; every authorization helper checks `status` and `is_deleted`.
- **Merge tool** (`/merge-tool`, Owner only) for duplicate accounts.
- **Onboarding-complete indicator** on `/team` and `/me` (tip-pool eligibility signal), excludes `is_assignable` modules, keyed on `department_scope`.

## Open

- Remove Team Member UI (Remove button, Removed team members section). Prompt drafted.
- Rewrite §2 of Roles and Permissions.md once the Stage 1 browser test passes.
- Portioning & Presentation move to GM-direct / Manager-suggests (ADL-103 follow-up).
- Kitchen GM flag: set `can_manage_team` for the Kitchen Operations Manager only, once their account exists.
