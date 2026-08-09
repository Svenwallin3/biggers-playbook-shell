# Visual audit — Biggers Training Platform

## What I looked at
Design tokens in `src/styles.css`, the app shell, and the shared training components (module header, step renderer, status badges, dashboard/manager brief, reference + sourcing screens). Signed-in screens can't be rendered from my sandbox (the app points at your own Supabase), so this is a structural/token-level read, not a pixel-by-pixel pass.

## Honest diagnosis: why it reads dull

1. **The brand colors are present but almost never used at size.** Forest green and golden orange exist as tokens, but nearly everything on screen is cream background + thin 1px borders + small gray text. The accent shows up only as tiny badges and hairlines. Nothing on a page is big, colored, or confident.
2. **No visual hierarchy between "the one thing to do now" and everything else.** Today's step, a nav card, and a footnote all get the same card treatment: white/cream box, thin border, same radius, same padding. On TrainualLearnUpon Absorb style sites the *current* item is a large, colored, unmistakable block and everything else recedes.
3. **Progress is invisible.** Training apps live on progress feedback — a ring/bar, "3 of 12 steps," track completion, a green checkmark that feels earned. Right now completion is mostly text.
4. **No imagery or iconography language.** Tracks (Hospitality / Market / Kitchen / Delivery) have no color identity, no icon, no cover treatment. Every module list item looks identical, which is exactly the "content blends together" problem your knowledge file predicted.
5. **Typography is doing too little.** Fraunces is a great display face but it's used at modest sizes; body text is uniformly small. No editorial scale contrast.
6. **Density is uniform everywhere.** Trainee screens should be roomy and encouraging; manager/admin screens should be dense and tabular. Right now they're the same.

## Recommended direction: "Market Signage"

Take cues from produce-market signage and chalkboard menus — Biggers-native, not generic SaaS. Bold flat color fields, confident display type, warm cream paper, orange used as a real signal color rather than a hairline.

### Color (extending the existing palette, not replacing it)
- Keep Forest Green as primary, Cream as background, Tan as surface.
- Add a **deep-green filled hero surface** used for the single most important block on each screen (today's step, current module). White text on green — high contrast, instantly draws the eye.
- Promote **Golden Orange** to the true call-to-action / "needs you" color: primary buttons on trainee screens, the "action required" state in the manager queue.
- Give each **track its own tint** (Hospitality = green, Market = orange-clay, Kitchen = terracotta, Delivery = stone) applied as a left color rail on cards, an icon chip, and section headers. This is the single highest-impact change for "content blends together."
- Keep terracotta/mustard strictly for blocked/refining states so status stays legible.

### Layout and component changes (no functionality changes)
- **Dashboard**: one large green "Up next" hero card with the step title in display type, a progress ring, and one big orange button. Everything else (browse training, report an issue, reference) drops to smaller secondary tiles below. Buttons get real labels ("Continue Day 1: Hospitality" instead of generic verbs).
- **Progress**: add a track progress bar to the dashboard and a "Step 3 of 9" indicator plus segmented day markers inside the module viewer.
- **Module viewer**: sticky header with module name + progress, larger step titles, clearer separation between the step body and the trainer sign-off block (sign-off becomes a distinctly colored, full-width band, since it's the certification moment).
- **Step type chips**: replace the small gray uppercase label with colored icon chips (read / photo / watch / quiz / trainer sign-off), so scanning a module reads at a glance.
- **Training library**: track-grouped sections with colored track headers and module cards showing step count + completion, instead of a flat link list.
- **Manager brief and admin screens**: tighten to a denser, more tabular rhythm; use the orange "needs you" signal only where action is required, so the queue is scannable.
- **Empty / coming-soon states**: keep the honest "content coming soon" copy but give it a proper illustrated-block treatment rather than a dashed gray box.
- **Copy pass**: button and heading text rewritten to be action-first and jargon-free (first-use abbreviation expansion respected).

## Suggested sequencing (credit-conscious)
1. **Token + shell pass** — new surface/hero/track color tokens, type scale, button styling. Cheap, affects everything.
2. **Dashboard + module viewer** — the two screens trainees actually live in. Biggest perceived improvement.
3. **Training library + track identity** — colored track system applied.
4. **Manager/admin density + copy pass** — last, lowest risk.

Doing 1+2 alone would move the app most of the way. 3 and 4 can wait.

## Technical notes
- All new colors added as oklch tokens in `src/styles.css` and registered in `@theme inline`; no hardcoded color classes in components.
- Track colors implemented as a token set plus a small `trackTheme(trackName)` helper so cards, chips, and headers stay in sync.
- Changes stay in presentation code: `src/styles.css`, `AppLayout`, `src/routes/index.tsx`, `modules.$moduleId.tsx`, `training-library.tsx`, and the shared `src/components/training/*` components. Queries, RLS, and progress logic untouched.

## Open question
Do you want me to pull the exact palette off biggersmarket.com first (fetch the live site and sample its greens/oranges/cream), or work from the current in-app approximations? Sampling the real site is one extra step but guarantees brand match.
