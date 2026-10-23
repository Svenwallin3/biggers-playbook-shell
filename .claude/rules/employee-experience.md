---
paths:
  - "src/routes/index.tsx"
  - "src/routes/modules.$moduleId.tsx"
  - "src/routes/training-library.tsx"
  - "src/routes/me.tsx"
  - "src/routes/search.tsx"
  - "src/routes/login.tsx"
  - "src/routes/reference*.tsx"
  - "src/routes/sourcing-board.tsx"
  - "src/components/training/**"
  - "src/components/reference/**"
  - "src/components/PathChoice.tsx"
---

# Employee Experience Rules

Applies to every screen a Staff-tier employee sees. Applies to all agents, including Lovable.

## Who you are designing for

- A new or part-time employee, often college-age, on their **own phone**, often mid-shift with one hand free.
- They may have 30 seconds. They are not reading instructions about the app.
- Two jobs only: (1) finish today's training in order, (2) find an answer fast during a shift.

## Layout and interaction

- **Mobile first.** Design and verify at 375px wide before desktop. No horizontal scroll. No content hidden behind hover.
- **One clear primary action per screen.** On Home that is "continue today's training." Secondary actions are visually quieter.
- **The employee always knows what's next.** After completing a step, the next step or "you're done for today" is shown immediately. Never land on a screen with no visible next move.
- **Tap targets at least 44px tall.** Primary buttons sit within thumb reach (lower half of the screen on mobile when practical).
- **Text size:** do not go smaller than the current trainee body size (`text-sm`) for reading content, and never shrink text to make something fit; let it wrap. Form inputs use at least 16px so iPhones do not zoom in on focus.
- Trainee screens use the default roomy density. Never apply `admin-dense` here.

## States every screen must handle

- **Loading:** skeletons or a short spinner. Never a blank screen.
- **Empty:** say why it is empty and what to do ("No training assigned yet. Check with your manager.").
- **Error:** what happened and what to do next, with a retry when retry makes sense.
- **Failed save:** if a step completion, quiz answer, checklist check-off or sign-off fails to save, the employee must see that it failed and be able to retry. Never show a success state before the write succeeds. Progress must never silently disappear.

## Content display

- `missing`/`blocked` steps render as visibly incomplete ("Content coming soon"). Never hidden as if they don't exist, never padded with invented content.
- `needs_restructuring` shows its real content with a "being refined" marker.
- A missing photo or video renders nothing, not a placeholder box.
- Admin-only fields (`content_notes`, `media_recommendation*`) never render here.
- Trainer-gated steps show the single generic line: "Your trainer needs to sign off here once completed."

## Tracked path vs. browsing

- The gated onboarding path (Home, `/modules/$moduleId`) and the browse-anything Training Library stay separate. Browsing never marks progress. The tracked path never lets a trainee skip ahead past a trainer stop.

## Search and Ask

- Results answer an operational question, not a folder lookup. Show the title and enough context to know it's the right item.
- The Ask assistant must keep its no-guess fallback and citations. Do not add freeform AI answers.

## Accessibility baseline

- Text and controls meet contrast using the brand tokens (see `design-system.md`). Never convey meaning by color alone; pair with text or an icon.
- Every image has alt text; decorative icons are `aria-hidden`.
- Every input has a visible label. Focus is visible for keyboard users.
- Respect `prefers-reduced-motion` for any animation.

## Sign-in

- Employees sign in on their own phone, often by opening the email in the Gmail or Outlook app. Both the magic link and the 6-digit code must work there. Do not remove the code box.
- Sessions persist on the device. Do not add forced sign-outs or password steps.

## Copy

- Follow the Words and copy section of `AGENTS.md`: Division, role not names, plain English, no em dashes.
- Button labels are verbs that say what happens ("Mark complete," "Start Day 2"), not "Submit" or "OK."
