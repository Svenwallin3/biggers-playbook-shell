# Owner "View as" switcher for testing roles

## Goal
Let an Owner see the app the way a Manager or General Manager would, without needing a second login email.

## What you'll see
- A small "View as" menu in the top bar, visible only to Owners.
- Options: Owner (normal), General Manager, Manager, Staff, plus a Division picker (Market, Kitchen, Delivery) for the non-Owner options.
- While it's on, a colored strip at the top says "Viewing as General Manager, Kitchen. Switch back". It stays on across pages until you switch back or sign out.
- Buttons, drag handles, delete/request-deletion buttons and menus follow the chosen role, so you can check that a Manager sees no create buttons and a General Manager only gets them in their own division.

## Important limit
This only changes what the screens show. The database still knows you are an Owner, so anything you actually save while "viewing as" is saved with Owner rights. For example, a "Request deletion" sent while viewing as a General Manager would really go into Approvals under your name, which you can then approve to test that flow end to end. The real security check, which already blocks Managers in the database, isn't changed.

## Technical details
- `src/hooks/useAuth.tsx`: add an owner-only override `{ tier, canManageTeam, divisionScope }` kept in sessionStorage (read after hydration). When it's set, the returned `employee` (auth_tier, can_manage_team, department_scope) and the derived `isOwner`, `isGeneralManager` and `isManagerOrOwner` flags reflect the override. Also expose `realIsOwner` and `viewAs`/`setViewAs`.
- `src/components/AppLayout.tsx`: add the owner-only "View as" dropdown and the banner. Both are gated on `realIsOwner`.
- No database or schema changes. No other screens touched, since they already read from `useAuth`.
