# Assignable modules: one compact tile on Preview training

## Answer to your question
Each module lives in exactly one division (Market, Kitchen, Delivery or Universal). There is only ever one copy, so editing it once updates it everywhere it is used. Division only decides where the module is *filed* — you can already assign any assignable module to any employee, whatever their division.

For a module meant for all three divisions (for example a general forklift or safety module), file it under **Universal**. The tile below will also appear on the Universal pill, so you can find and edit it there. No copies, no syncing.

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
- No database or permission changes.
