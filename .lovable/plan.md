# Assignable modules: one compact tile on Preview training

## Shared modules (like Forklift)
There is only ever one copy of a module, so editing it anywhere updates it everywhere. You can already assign any assignable module to anyone, whatever their division.

For modules used by more than one division:
- Shared modules are stored behind the scenes as "all divisions" (Universal). The Universal pill stays hidden.
- A shared module shows up in the Market, Kitchen **and** Delivery lists, with a small "All divisions" tag.
- Clicking Edit from any of the three opens the same single module, so one change covers all three.
- When creating a new module with **+**, you pick "This division only" or "All divisions".

## What changes
On Preview training, the long expanded list is replaced by one small tile under the division/branch buttons:

```text
[ Assignable modules in Market  (17)   >   ]   [ + ]
```

- Clicking the tile opens a side panel with:
  - A search box (filters by name or category)
  - Modules grouped by category, sorted A–Z
  - Each row: **Edit** (pencil, opens the module editor) and **Assign** (opens the existing assign dialog with that module preselected)
- The **+** button (Owners and GMs only) opens the existing "New module" dialog with "assignable" already turned on for that division, then goes straight to the new module's editor.
- Regular managers see the list with Edit/View only, matching current permissions.
- The page no longer gets pushed down, no matter how many modules there are.

## Technical details
- File: `src/routes/preview.tsx` only. Replace the `<details>` block (lines ~332–367) with a Card button + shadcn `Sheet`.
- Reuse `NewModuleDialog` (`defaultIsAssignable`, trackId = active track) and `NewAssignmentDialog` (`presetModuleId`/`presetModuleName`), both already used on `/assign-training`.
- Gate + and Assign on `isOwner || isGeneralManager`.
- Tile list = assignable modules on the active track + assignable modules on the Universal track (tagged "All divisions").
- + button: small choice before `NewModuleDialog`; "All divisions" passes the Universal track's id.
- No database or permission changes.
