---
paths:
  - "src/styles.css"
  - "src/components/**"
  - "src/routes/**"
  - "src/lib/track-theme.ts"
  - "components.json"
---

# Design System Rules

Applies to all agents, including Lovable. Full detail: `docs/governance/Design System.md`.

## The brand is live. Do not revert it.

A custom brand system has been live since 2026-08-07. Never reintroduce the default shadcn neutral theme.

| Token | Hex | Use |
|---|---|---|
| Primary | Forest Green `#173f2e` | Primary actions, brand |
| Primary hover | Dark Green `#0f3022` | Hover |
| Primary tint | Pale Green `#eaf1e7` | Subtle backgrounds |
| Accent | Golden Orange `#f5a723` | Highlights, CTAs |
| Accent on dark | Bright Gold `#ffb62f` | CTAs on dark surfaces |
| Background | Cream `#fffdf7` | Base surface |
| Muted | Tan `#f3ede0` | Secondary surface |
| Text | Ink `#171717` | Body |
| Success | Sage `#4a7c59` | Confirmations |
| Warning | Mustard `#c17817` | Cautions |
| Destructive | Terracotta `#b3452c` | Errors, deletes |
| Info | Muted Stone | Informational (not corporate blue) |

## Rules

- **Use semantic tokens only.** No ad hoc Tailwind color utilities (`blue-500`, `red-600`, `emerald-*`, etc.). If a new color need exists, extend the token set in `src/styles.css` deliberately.
- Tokens live in `src/styles.css` under `@theme inline` (Tailwind v4). There is no `tailwind.config.js`.
- Radius derives from `--radius: 0.5rem`. Do not hardcode radii.
- Typography is Inter. Headings use `font-display`.
- **Track colors** come from `src/lib/track-theme.ts` (hospitality forest green, market gold, kitchen terracotta, delivery sage) as a left rail + chip + label. A new track gets a new color; never reuse one.
- **Density:** trainee screens roomy; manager/owner screens `admin-dense` via `AppLayout`. Never mix.
- **Print styles** (`@media print`, `.print-sheet`, `.print-box`) are a real feature for paper checklists and guides. Preserve them.

## Components

- Reuse before creating: `src/components/ui/` (shadcn, new-york style), then domain folders.
- Buttons: existing 6 variants x 4 sizes. Do not hand-roll button styles.
- Expandable sections: `collapsible.tsx`, default open, chevron trigger.
- Edit affordance: icon-only pencil with an "Edit" tooltip, everywhere.
- Photos: `PhotoUpload` / `StoredPhoto` (compressed client-side to 1600px JPEG 80%, private bucket, signed URLs). Videos: `VideoEmbed` with a YouTube URL.
- Icons: `lucide-react` only.
- A genuinely new pattern is allowed only when no existing one fits. Record it in `docs/governance/Design System.md` once shipped.

## Contrast

- Body text on Cream/Tan uses Ink. White text only on Forest Green, Dark Green or Terracotta. Do not put white text on Golden Orange; use Ink.
