---
name: update-governance
description: Use at the end of any task in the Biggers Training Platform that built something, changed behavior, changed a rule, or made a consequential decision. Updates docs/state, the Architecture Decision Log, and governance docs within the allowed edit limits.
---

# Update Governance

Docs must match the live app. Conversation history is not a record.

## What you may edit

| Change | Allowed without explicit instruction? |
|---|---|
| `docs/state/*` to describe what is now live or open | Yes |
| Append a new ADL entry | Yes |
| Edit an existing ADL entry | No, only if the request says so |
| Change a rule in `AGENTS.md` or `.claude/rules/*` | No, only if the request says so |
| Change a non-negotiable or the permissions matrix | No, only if the request says so |
| Change other `docs/governance/*` text | Only to record a rule change the request approved |

Never rewrite a rule so it matches code you just wrote. If the code needed a rule change that was not approved, say so in your reply and leave the rule alone.

## 1. Decide what changed

- **Build state changed** (something new is live, a bug fixed, an item now open)? Update `docs/state/`.
- **Consequential decision** (architecture, permissions, UX pattern, data model, training structure)? Add an ADL entry.
- **Approved rule change?** Update the rule file and the matching governance doc together, so they never disagree.

## 2. docs/state

- Find the area file (`auth-hosting`, `team-permissions`, `training-universal`, `training-kitchen`, `training-market`, `reference-library`, `content-editing-approvals`, `operations`, `open-items`).
- Edit in place. Present tense, what is true now. One bullet per capability. Remove lines that are no longer true; do not strike through or narrate history.
- Add new open questions, bugs or debt to `open-items.md`; remove them when closed.
- Update the one-line status and date for that area in `docs/state/README.md`.

## 3. ADL entry format

Append to `docs/governance/Architecture Decision Log.md` with the next number, and add a line to the Active Decisions index at the top:

```
**ADL-###**
Date: YYYY-MM-DD
Decision: what was decided, specifically.
Reason: why, including who decided.
Affected areas: files, tables, screens.
Alternatives rejected: what else was considered and why not.
Status: Live / Approved, not built / Superseded by ADL-###.
```

If a new entry supersedes an old one, set the old one's index line to "Superseded by ADL-###" (editing the index is allowed; the old entry's body stays as written).

## 4. Writing rules

- No em dashes. Division, not Department. Roles, not names.
- Short. State facts, not narrative.
