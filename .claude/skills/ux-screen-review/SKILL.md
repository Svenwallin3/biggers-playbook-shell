---
name: ux-screen-review
description: Use before shipping a new or changed screen, dialog or flow in the Biggers Training Platform, for trainees or managers. Reviews it against the employee and manager experience rules, mobile, copy and accessibility.
---

# UX Screen Review

Review the screen as the person who will actually use it. Report each item as pass or fail with a specific fix. Fix failures before calling the screen done.

## 0. Set the scene

Write one line: who uses this screen, on what device, in what moment. Example: "A new Kitchen hire, on their phone, between tasks on Day 2, wants to finish the next step."

## 1. Purpose and primary action

- Can the user tell what this screen is for within 3 seconds?
- Is there exactly one obvious primary action? Are secondary actions visually quieter?
- After the action, is the next move obvious (next step, done for today, back to queue)?
- Could this be part of an existing screen instead of a new one?

## 2. Mobile (375px)

- No horizontal scroll; nothing hidden behind hover.
- Tap targets at least 44px; primary button within thumb reach.
- Long text wraps; tables become cards or scroll in their own container.
- Sheets and dialogs fit the screen and the keyboard does not cover the active input.
- Inputs at least 16px (prevents iPhone zoom).

## 3. States

- Loading: skeleton or spinner, never blank.
- Empty: explains why and what to do.
- Error: says what happened and what to do next; offers retry where useful.
- Failed save: visible, retryable, no false success.
- Placeholder content (`missing`/`blocked`) shows as incomplete, never invented.

## 4. Copy

- Plain English, short sentences, second person, roughly 6th to 8th grade reading level.
- Uses fixed terms: Division, Location, Path, Section, Module, Step, Day, Trainer stop, Sign-off, Suggest a change.
- No "Department" in UI. No people's names. No em dashes. Abbreviations spelled out on first use.
- Buttons are specific verbs ("Mark complete," "Send for sign-off"), not "Submit."
- Counts are concrete ("3 waiting for sign-off").

## 5. Visual

- Brand tokens only; track colors from `track-theme.ts`.
- Trainee screens roomy; manager screens `admin-dense` (route listed in `isAdminScreen`).
- Existing components and patterns reused (pencil edit icon, collapsible sections, `PhotoUpload`, `VideoEmbed`).

## 6. Accessibility baseline

- Contrast OK on brand tokens (white text only on dark greens or terracotta).
- Meaning never by color alone.
- Images have alt text; decorative icons `aria-hidden`.
- Every input has a visible label; focus is visible; keyboard can reach every control.
- Animations respect `prefers-reduced-motion`.

## 7. Trainee-specific (skip for manager screens)

- No admin-only fields visible, including in `/preview`.
- Tracked path cannot skip a trainer stop; browsing never records progress.
- Matches `/preview` exactly, apart from admin controls.

## 8. Manager-specific (skip for trainee screens)

- Leads with what needs action, not history.
- Sign-off and review take the fewest taps possible.
- No new notification feed or alert stream.
- Owner `department_scope = null` sees all Divisions.
