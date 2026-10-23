# Kitchen Training (Days 1 to 4)

Paths: **Production** (weekday crew) and **Service** (weekend crew), stored in the `paths` table. Bakers follow Production. Content for Universal Day 1 and Kitchen Production/Service is near final; the Owner hand-edits it. Edit only when a task names it.

## Live

- **Day 1 (self-paced, after Universal):** Kitchen Hazard Awareness (knife safety video `needs_restructuring`, hazards overview with burn/cut first response and first-aid kit pointer), Food Safety, Numbers & Storage (health department infographic, TCS, critical temperatures, sanitizer and labeling, cooler storage order, receiving), Allergen Awareness, Food Safety & Allergen Quiz. Hands-on reinforcement happens at Day 2's trainer stop. Day 1's trainer stop is Universal's.
- **Day 2, both Paths:** "Today at a Glance" per Path, Shared Day 2 Basics (checklists, POS/Clover, mixer and oven videos, Buy From & Sell To the Market logs, Who to Ask), then Path content:
  - Production: menu orientation, where your assignment lives, cook vs. pack-out, recipe execution, time standards, packaging, cooling, mise en place, Ice Cream Window, walkthrough and sign-off.
  - Service: menu philosophy (no specific current menu items; the live menu is walked in the Manager Guide), station orientation, reading and calling tickets, paging, walkthrough and sign-off.
- **Day 3:** one combined step per Path ("What day 3 looks like") holding the day overview, judgment calls and sign-off.
- **Day 4:** one certification step per Path. Production is a full-shift, trainer-observed deep dive; Service is a trainer-observed certification cycle.
- **Manager Walkthrough Guides** for Kitchen Days 1 to 4, plus "How to Run a Walkthrough (Kitchen)". A weekly scheduled drift check fixes stale references only when curriculum changed after the guide (ADL-102).
- Sign-off authority: Kitchen managers (manager tier). Staff-tier trainers can run a walkthrough but cannot sign off in the app.

## Open

- Photos `missing`: printed recipe card, properly staged station, Service station layout, ticket example. Service "Presentation & portion standards" is `missing` pending the manager's spec sheet.
- Empty modules awaiting Owner-tier delete: "Day 3 Structure & Judgment Calls" (Production), "Rush Sequencing & Common Scenarios" (Service).
- Production "Today at a Glance" on Day 2 is `day_position = middle` while Service's is `start`; check whether Production's should also be `start`.
- Day 2 to 4 trainer stops are last by module order, not by `day_position = end`.
- Naming inconsistency: "Cold side" in Station orientation vs. "Cold Prep" in the sign-off's Reference pointer.
- Possible stale duplicate block on "POS / Clover Basics" from in-progress editing; Owner's call.
