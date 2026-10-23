---
name: trainee-journey-check
description: Use after any change to module day assignment, step or module order, sub-paths, cross-training, plan or preview logic, or when content is added to Days 1 to 4. Walks the real Day 1 to 4 journey for each Division and Path.
---

# Trainee Journey Check

Walks what a new hire actually sees, day by day, for each Division and Path. Uses `/preview` plus database queries. Report a short table per Division and Path.

## Journeys to check

- Kitchen, Production
- Kitchen, Service
- Market (each Location only if location-tagged content exists)
- Delivery (expect Universal Day 1 only, or whatever has been built)
- One cross-training case if cross-training logic was touched (for example Kitchen home plus Market)

## 1. Pull the plan from the database

```sql
select t.department as division, m.day_assignment as day,
       (t.department = 'universal') as is_universal, t.sequence_order as t_order,
       m.sequence_order as m_order, m.name as module, p.name as path,
       coalesce(s.day_position, 'middle') as day_position,
       s.sequence_order as s_order, s.title, s.step_type, s.content_status,
       (select count(*) from step_blocks b where b.step_id = s.id and b.is_deleted = false) as blocks
from modules m
join tracks t on t.id = m.track_id
left join paths p on p.id = m.path_id
left join steps s on s.module_id = m.id and s.is_deleted = false
where m.is_deleted = false and t.is_deleted = false and m.is_assignable = false
order by m.day_assignment,
         case coalesce(s.day_position,'middle') when 'start' then 0 when 'middle' then 1 else 2 end,
         (t.department = 'universal') desc, t.sequence_order, m.sequence_order, s.sequence_order;
```

This mirrors `compareModulesByDay` and `getDayGroupedSteps` in `src/lib/training.queries.ts`. If the app logic changed, read those functions and adjust. For a given journey, keep Universal rows, the Division's rows with `path` null, and the rows for that Path.

## 2. Check each day, per journey

| Check | Expected |
|---|---|
| Universal merged in | Universal Day 1 appears for every Division, first |
| Order | `start` steps, then self-paced `middle` steps, then the trainer stop |
| Trainer stops | Exactly one `doing_signoff` or `supervised_live_practice` per day, and it is the last step of the day (flag any that are last only by module order rather than `day_position = 'end'`) |
| Path | Each Path sees its own modules plus shared (`path_id` null) modules |
| Empty modules | Show "This module has no steps yet," never a blank screen |
| Placeholders | `missing`/`blocked` steps visible as incomplete, not hidden |
| Content source | Steps with blocks render blocks; note any step with neither blocks nor legacy content |
| Day 4 | A `supervised_live_practice` trainer stop |

## 3. Confirm in `/preview`

- Open `/preview` for each Division (and sub-path where Kitchen applies). Confirm the order and trainer stop match the query.
- Open one step in `/modules/$moduleId?preview=1` and confirm it renders identically to `/preview`, aside from admin controls.
- Check at 375px width.

## 4. Manager Guide sync

If any Day 1 to 4 day assignment, order, or substantive step content changed, open that day's Manager Walkthrough Guide in Reference Guides (Manager Guides tab) and list any stale references. Do not reorganize a guide's sections. Fix stale inline references only if the task allows content edits; otherwise report them.

## 5. Report

For each journey: Day 1 to 4, step count, trainer stop title, issues found. Then a list of fixes made or needed.

## Testing limits

`/preview` does not record progress and the Owner "View as" switcher saves with Owner rights. Progress saving, sign-off authorization and RLS scoping need a real Staff account per Division. List those checks as "needs a real-account test" until test accounts exist.
