
# Design System — Biggers Training Platform

Status: Authoritative. Audited directly against live `src/styles.css`, `components.json`, and representative component files in Lovable project `23de8112-f5cb-48b9-ad2c-a85026287649` on 2026-08-10.

**This document supersedes the Lovable Project Knowledge panel's visual-design section, which is stale.** That file currently states the app is still on "Lovable's default shadcn/ui theme (neutral/minimal)" awaiting a post-launch visual pass. That is factually wrong today — a full custom brand system shipped 2026-08-07 and has been in continuous use since. See Current Build State.md for the recommended fix (update the Lovable Knowledge panel to point at this file, so a future Lovable prompt doesn't regress the visual system back toward "default theme, real pass comes later").

---

## 1. Foundation

- **Component library:** shadcn/ui, `"style": "new-york"`, Radix UI primitives, `class-variance-authority` for variants. ~35 primitives in `src/components/ui/`.
- **Styling engine:** Tailwind v4, CSS-native `@theme inline` configuration in `src/styles.css` — there is no `tailwind.config.js`; tokens live directly in CSS custom properties.
- **Typography:** Inter (weights 400–800), loaded via Google Fonts in `__root.tsx`. Mapped to both `--font-sans` (body) and `--font-display` (headings, `-0.02em` tracking via a `font-display` utility class).
- **Radius:** base `--radius: 0.5rem`; `sm/md/lg/xl/2xl/3xl/4xl` all derive from it via `calc()` — changing the one base value re-scales the whole system.

## 2. Color Palette (oklch, light mode — full parallel dark-mode palette also exists)

Pulled live from biggersmarket.com's own brand CSS, applied platform-wide 2026-08-07 — replaced an earlier neutral shadcn default and fixed hardcoded off-brand Tailwind utility colors (rose/emerald/sky/violet) that had crept into the Sourcing Board.

| Token | Hex | Use |
|---|---|---|
| Primary | Forest Green `#173f2e` | Primary actions, brand identity |
| Primary hover/depth | Dark Green `#0f3022` | Hover states |
| Primary tint | Pale Green `#eaf1e7` | Subtle backgrounds |
| Accent | Golden Orange `#f5a723` | CTAs, highlights (Sven's stated preferred accent) |
| Accent-on-dark | Bright Gold `#ffb62f` | CTAs against dark surfaces |
| Background/card | Cream `#fffdf7` | Base surface |
| Surface/muted | Tan `#f3ede0` | Secondary surface |
| Text | Ink `#171717` | Body text |
| Success | Sage Green `#4a7c59` | Confirmations |
| Warning | Warm Mustard `#c17817` | Cautions |
| Destructive | Terracotta `#b3452c` | Errors/deletes — deliberately warm, not stoplight-red |
| Info | Muted Stone | Informational — deliberately not generic corporate-SaaS blue |

**Rule: this palette is the brand. Do not introduce ad hoc Tailwind color utilities (blue-500, red-600, etc.) on any screen — route new color needs through the existing semantic tokens or extend the token set deliberately, the same fix already applied once to the Sourcing Board.**

## 3. Per-Track Color Coding

Each track has its own accent color, implemented via `src/lib/track-theme.ts` and applied consistently as a colored left rail + chip + label wherever a track is represented:

- `--track-hospitality` → forest green
- `--track-market` → gold/orange
- `--track-kitchen` → terracotta
- `--track-delivery` → muted sage

New tracks should extend this mapping rather than reusing an existing track's color.

## 4. Density Modes

- **Trainee-facing screens:** default roomier spacing/type scale.
- **Manager/owner (admin) screens:** `admin-dense` utility class shrinks font-size/heading-size/table-size, applied automatically via `AppLayout`'s `isAdminScreen` check. This is intentional, matching the Product Constitution's admin-efficiency-over-visual-polish priority for admin surfaces specifically — do not apply admin density to any trainee-facing screen, and do not apply trainee-roominess to a new admin screen without a reason.

## 5. Print Support

A dedicated `@media print` block (`.print-sheet`/`.print-box`) exists for a blank paper-checklist fallback. This is a considered, real feature (not incidental boilerplate) — preserve it when touching checklist-related CSS.

## 6. Components — Standing Patterns

- **Buttons:** 6 variants (default/destructive/outline/secondary/ghost/link) × 4 sizes, `class-variance-authority`-driven. Use existing variants; do not hand-roll a new button style.
- **Cards:** standard shadcn card pattern, used consistently.
- **Badges:** used for `content_status` (ready/needs_restructuring/missing/blocked — color-coded) and for step-type/track chips.
- **Collapsible/Accordion:** `collapsible.tsx` is the standing pattern for expandable sections (Reference Library sections, Manager Notes) — default-open with a chevron trigger is the confirmed preference (fixed 2026-08-07 after these primitives were found installed-but-unused).
- **Content rendering — card grid vs. numbered list:** any `content_body` where every line matches `Label | Value` auto-renders as a card grid; everything else renders as a numbered list. This is a **per-content judgment call** applied at content-authoring time, not a universal rule — cards for parallel/scannable facts, numbered lists for sequences/hierarchies where order carries meaning. Card sizing: values over ~28 characters left-align at a smaller size instead of centering an oversized headline (fixed after a real legibility bug).
- **`## Heading` convention:** a `content_body` line starting with `## ` renders as a bold sub-header with its own bulleted list beneath it — lets multiple short topics share one page without losing individual titling. Opt-in, backward compatible.
- **Media rendering:** photo/video render purely based on presence of `media_url`/`video_url` on ANY step type — not gated by `step_type`. No placeholder icon box when media is absent (matches the "never fabricate/pad content" rule) — a missing-media step simply shows no media block.
- **`ModuleHeader.tsx`:** shared component extracted 2026-08-07 specifically to eliminate duplicated header JSX between the live module viewer and `/preview` — this fixed a real bug class where edits to one view didn't propagate to the other. **Any future module-header change must go through this shared component, never a per-screen copy.**
- **Video embed:** one reusable `VideoEmbed` component, plain YouTube URL storage (`video_url` field on steps and reference-document sections) — no Supabase Storage video hosting.
- **Photo upload:** one shared `PhotoUpload`/`StoredPhoto` component (client-side compression to 1600px/JPEG 80% before upload to the private `reference-photos` bucket, signed URLs), reused across Sourcing Board and Delivery Issues, intended for Portioning as well.

## 7. Mobile vs. Desktop Behavior

- Nav collapses to a hamburger/slide-out panel below the `md` breakpoint, carrying the same grouping as desktop (see Product Constitution §7-8) — most training happens on a phone, this is a first-class requirement, not an afterthought.
- Sourcing Board thumbnails and pop-up photo forced to `aspect-square` via `object-cover` for consistent presentation across row and detail views.

## 8. When a New Component May Be Introduced

Per project instructions, default to reusing an existing component. Before adding a new one:
1. Check `src/components/ui/` for an existing shadcn primitive that solves it.
2. Check the domain component folders (`training/`, `admin/`, `manager/`, `reference/`, `sourcing/`) for an existing pattern already solving a similar problem (e.g. the collapsible pattern, the card-grid renderer).
3. Only introduce a new pattern when neither exists, and document it here once shipped.

## 9. Design Debt

- **Lovable Project Knowledge's visual-design section is stale** (see header note above) — recommend updating it to reference this file, so a future Lovable agent turn doesn't "helpfully" revert toward a described-but-outdated neutral theme.
- ~~No authoring UI for Huddle Cards or Manager Notes~~ — **Resolved 2026-08-11.** `/huddle-notes` now provides full create/edit/soft-delete/restore for both, gated to match existing RLS (Huddle Cards owner-only, Manager Notes manager/GM/owner). See ADL-026.
- ~~No management screen for Delivery Issues as a set~~ — **Resolved 2026-08-11.** `/delivery-issues` now lists every open issue company-wide, with a Resolve action, for managers/GMs/owners. See ADL-030.
- **`content_notes` is not rendered anywhere in the UI for a `ready`-status step** — only surfaces for `missing`/`blocked` statuses, and only to admins. One specific case (a manager-only walkthrough reference) was worked around with a dedicated "Manager note" callout gated on `canSignOff`, but the general limitation likely still applies to any other `ready` step carrying a `content_notes` value. Worth an audit pass for other silently-hidden notes.
- **Non-square photos center-crop rather than resize** until re-uploaded — an accepted, known tradeoff, not scheduled for a fix.
- **Redundant overlapping RLS policies** on `employees` and `huddle_cards` (see Database Architecture.md) don't affect rendering but indicate a cleanup pass is due before the schema grows further.
