# Clear up the preview banner wording

## What's happening now

That yellow bar shows up because the module was opened in preview ("Preview as trainee" on Pumpkin Yard Training). Its wording — "nothing here is being saved" — is too broad and is what's causing the confusion.

In reality only two different things are going on in preview:

- Trainee activity (marking steps done, sign-offs, initials) is not recorded — that's intentional, so previewing doesn't create fake progress.
- Content edits made through the pencil are real saves. Checked in the code: the pencil and its save button are controlled only by your edit rights, not by preview, so anything you change and save there is written for everyone. Nothing needs to be built to make that work.

## The change

Reword and shrink the bar so it says the right thing, on one compact line:

- Title line: "Preview mode — trainee progress isn't recorded"
- Second line: "Edits you make with the pencil are saved for real."

Same placement at the top of the page, same warm warning styling, but half the height so it stops dominating the screen.

## Technical notes

Single file: `src/routes/modules.$moduleId.tsx`, the `previewMode` banner block. Copy change plus tighter padding/text sizing. No database, logic, or permission changes.
