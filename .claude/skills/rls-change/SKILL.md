---
name: rls-change
description: Use when adding or changing any Supabase RLS policy, guard trigger, SECURITY DEFINER function, grant, or any feature that lets a user write data. Ensures permissions are enforced in the database, not just hidden in the UI.
---

# RLS and Permission Change Checklist

The UI hiding a button is never authorization. This has been wrong in this project at least five times (deactivation, Sourcing Board delete, checklist scoping, quiz answer key, GM location type). Treat every write path as unverified until checked here.

## 1. Inspect live state first

Run against project `kouyxrwnzjphuvnvxwyj`:

```sql
-- Policies on the table
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = '<table>';

-- Triggers on the table
select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid = 'public.<table>'::regclass and not tgisinternal;

-- Function body
select pg_get_functiondef('public.<function>'::regproc);
```

Do not rely on `docs/` alone; the database can be newer.

## 2. Design the rule per tier

Fill this in before writing SQL:

| Tier | SELECT | INSERT | UPDATE | Soft delete | Scope |
|---|---|---|---|---|---|
| Staff | | | | | own rows? |
| Manager | | | | | own Division/Location |
| GM | | | | | own Division/Location |
| Owner | | | | | all (`department_scope` null) |

Remember:

- Soft delete is an UPDATE. Any new UPDATE grant must not accidentally allow setting `is_deleted = true`. Add or extend a guard trigger if needed.
- `WITH CHECK` is evaluated against the new row. Use it to block moving a row out of scope.
- Market scope also needs `location_id`. `location_id` is a uuid; compare matching types.
- Reuse the helpers: `has_tier()`, `is_manager_or_owner()`, `is_gm()`, `my_department()`, `my_location()`, `can_manage_progress_for()`, `gm_can_review_suggestion()`. They already require `status = 'active' and is_deleted = false`.
- Wrap `auth.uid()` as `(select auth.uid())`.
- New `SECURITY DEFINER` functions: derive identity from `auth.uid()`, set `search_path`, revoke execute from `anon` unless needed, add a `COMMENT ON FUNCTION` recording why definer is safe.
- Never expose answer keys or admin-only fields through SELECT to trainees; use a definer RPC that returns only safe columns.

## 3. Write the migration

- One migration, clear name, idempotent where practical (`drop policy if exists` before `create policy`).
- No hard deletes. No data rewrites unless the request asked.

## 4. Verify by simulation

For each tier, simulate a session and confirm allowed and denied cases. Roll back afterward.

```sql
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<auth_user_id>', 'role', 'authenticated')::text, true);
set local role authenticated;
-- attempt the allowed write: should succeed
-- attempt an out-of-scope write: should fail
rollback;
```

Cover at least: Staff denied, Manager in scope, Manager out of scope, GM in scope, GM out of scope, Owner, inactive employee denied.

## 5. Finish

- Run Supabase advisors (security and performance) and note any new findings.
- Update the permissions table in `AGENTS.md` and `docs/governance/Roles and Permissions.md` only if the request explicitly changed a rule. Otherwise record the implementation in a new ADL entry and `docs/state/team-permissions.md`.
