---
name: post-build-audit
description: Use after any significant build, Lovable pass, or multi-file change in the Biggers Training Platform, before calling the work done. Checks the result against the spec, permissions, mobile, states and regressions.
---

# Post-Build Audit

"It renders" is not done. Work through every section. Report results as a short list: pass, fail (with the fix), or not testable (with why).

## 1. Diff against the spec

- Read the full diff. Every changed file should map to a line in the spec.
- Flag any change outside scope: unrelated refactors, renamed props, restyled components, new dependencies, edited migrations, regenerated files changed by hand.
- Confirm no database change was made if the spec said none.

## 2. Acceptance criteria

Check each acceptance criterion one by one. Quote it, then state pass or fail with evidence (file and line, or query result).

## 3. Permissions

- For each tier (Staff, Manager, GM, Owner), state what they can see and do on the changed feature.
- Confirm the database enforces it (policy or trigger), not only the UI. If the change touched permissions, the `rls-change` simulation must have been run.
- Owner with `department_scope = null` sees everything, not nothing.

## 4. Mobile at 375px

Walk the changed screens at 375px wide in `/preview` as a trainee where applicable:

- No horizontal page scroll, nothing cut off.
- Primary action visible and reachable with a thumb; tap targets at least 44px.
- Dialogs and sheets fit and scroll internally.

## 5. States

For each changed screen: loading, empty, error, and failed save (if it writes). A failed write must show a visible failure with retry and must not show success first.

## 6. Regressions

Spot-check the neighbors listed under "Must not change" in the spec, plus:

- `/preview` still matches the trainee module view for a changed step type.
- Day order and one trainer stop per day (run `trainee-journey-check` if plan logic changed).
- Sign-off still works from the module walk and the Training Queue.
- Print styles still work if Reference screens changed.

## 7. Copy and design

- No "Department" in UI copy; no people's names in content or copy; no em dashes.
- Only brand tokens; no ad hoc Tailwind colors.

## Testing limits (current)

Testing currently happens through `/preview` and the Owner "View as" switcher. Neither tests real RLS or saved progress for a Staff account (saves run with Owner rights, and preview does not record progress). For any change to permissions or progress saving, list it as "needs a real-account test" and say exactly what to test. When dedicated test accounts exist (one Staff login per Division), run those checks signed in as each.
