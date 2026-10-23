---
name: training-content-authoring
description: Use when writing or editing Biggers training content (steps, modules, quizzes, Manager Guides, checklists, SOPs) directly in Supabase or through the app. Covers instructional format choices, step_blocks, and keeping Manager Guides in sync. Not for app code changes.
---

# Training Content Authoring

You are acting as an instructional designer, not a transcriber. Source documents tell you what is true; they do not dictate the learning structure.

## 0. Before writing anything

- **Read what exists.** Query `step_blocks` for the step before concluding it is empty. Legacy `content_body`, `media_url` and `video_url` being null is not evidence of an empty step.
- **Near-complete areas:** Universal/Hospitality Day 1 and Kitchen Production/Service Days 1 to 4 are close to final, and the Owner hand-edits them. Edit them only when the task names them specifically. They are not locked.
- **Never invent facts.** Temperatures, procedures, locations, names of items, who does what: if the source does not say it, ask or leave the step `missing` with an admin note. Never fill gaps with plausible text.

## 1. Choose the intervention

Not every problem needs training. Ask in order:

1. Could a checklist, sign, label or process change remove the need to remember this? Recommend that instead.
2. Must they remember it, or just find it when needed? Find-it content belongs in Reference (SOP, Checklist), not the 4-day path.
3. Is it a skill that needs practice or verification? Then it ends in the day's single trainer stop.

## 2. Choose the format

| Content | Format |
|---|---|
| Default | Short text (paragraph, numbered list) |
| Correctness is visual and static (display, label, stacking, plating) | Photo |
| Motion or technique (knife work, equipment, pallet jack, register) | Video, 30 to 90 seconds, one per skill. Keep scarce |
| Wrong answer has real consequences (food safety numbers, allergens, age verification, cash) | Quiz, 3 to 5 questions |
| Must be physically demonstrated | Folded into that day's one trainer stop |
| Behavioral (hospitality, guest recovery) | Model it in text/video, certify by live role-play at the trainer stop |

- Do not add a quiz to anything already certified live.
- Do not cite "people remember 10% of what they read" or the "Cone of Learning." They are not real findings.

## 3. Structure rules

- Day comes from the module. To put a step on a different day, use or create a module on that day. Never change a shared module's day.
- Exactly one trainer stop per day, last in the day. Set `day_position = 'end'` on new trainer stops so order cannot drift. Combine all hands-on items for that day into it. A step that must open the day (like Clock In) uses `day_position = 'start'`.
- Path-specific modules set `path_id` to the matching `paths` row; shared modules leave it null. Do not write the legacy `modules.path` text column.
- Order by first-shift usefulness: what they will do in hour one comes first.
- One topic per step. Short steps beat long ones on a phone.
- Use `supports_manager_initials` for acknowledgment-type items (handbook, facilities walk), never as a substitute for a real sign-off.
- Guest-service content: name what the employee can fix themselves vs. what needs a manager, and give a short repeatable framework (LAST: Listen, Apologize, Solve, Thank). Allergy questions always escalate.
- Where a track splits across crews (Kitchen Production weekdays vs. Service weekends), name the handoff at the seam in the outgoing crew's Day 3 content.
- Menus and items that change often do not go in self-paced content. Teach the principle; the live specifics go in the Manager Walkthrough Guide.

## 4. Writing rules

- New content goes in `step_blocks`. Leave `steps.content_body` null on new steps.
- Block types: `heading`, `paragraph`, `list` (numbered or bulleted, optional start), `photo`, `gallery`, `video`, `label_value`, `danger_zone`.
- `label_value` for parallel, scannable facts. Numbered `list` when order matters.
- Plain English, roughly 6th to 8th grade. Second person. Short sentences.
- Spell out every abbreviation on first use (Time/Temperature Control for Safety (TCS), First In First Out (FIFO)).
- Division, never Department. People by role, never by name. No em dashes.
- Set `content_status` honestly: `ready`, `needs_restructuring`, `missing`, `blocked`. Put internal notes in `content_notes` (never shown to trainees).
- Photos go through Supabase Storage (`reference-photos`). Videos are YouTube URLs.

## 5. Quizzes

- Questions live in `quiz_bank` on a `quiz` step. 3 to 5 questions, each tied to a real consequence.
- One clearly correct option, plausible wrong options, a one-line explanation.
- The same questions are reused for day-7 and day-30 retention checks, so write them to stand alone.

## 6. Keep Manager Guides in sync

Any change to a Day 1 to 4 module day, step order, or substantive content: open that day's Manager Walkthrough Guide (`reference_documents`, Manager Guides) in the same pass and fix stale references. Do not reorganize a guide's section structure; that is the Owner's call.

## 7. After writing

- Run `trainee-journey-check` for the affected Division if structure or order changed.
- Edits to `modules`, `steps`, `tracks`, `reference_documents` are versioned automatically by `record_version()`.
- Update `docs/state/` for the affected Division (`update-governance` skill).
