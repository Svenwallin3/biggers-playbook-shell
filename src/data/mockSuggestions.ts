import type { ContentStatus, StepType } from "./mockTraining";

export interface Suggestion {
  id: string;
  stepId: string;
  stepTitle: string;
  moduleId: string;
  submittedBy: string;
  submittedRole: string;
  submittedOn: string;
  status: "pending" | "approved" | "rejected";
  /** 3-field structured form */
  whatIsTheStep: string;
  howIsItDone: string;
  howDoYouKnow: string;
  currentBody: string[];
}

export const mockSuggestions: Suggestion[] = [
  {
    id: "sug_1",
    stepId: "step_s1",
    stepTitle: "FIFO rotation on the dry shelf",
    moduleId: "mod_market_stocking",
    submittedBy: "Andrew Cameron",
    submittedRole: "Store GM",
    submittedOn: "Jul 29",
    status: "pending",
    whatIsTheStep: "Rotating dated product on the dry shelf before restocking.",
    howIsItDone:
      "Pull the whole front row into a tote, wipe the shelf, then reload oldest-to-newest front to back. Anything inside 7 days of code goes on the markdown cart.",
    howDoYouKnow:
      "Spot-check five random units from the front row — every date should be equal to or earlier than the units behind it.",
    currentBody: [
      "Pull existing product forward before anything new goes on the shelf.",
      "Check the date on every unit you pull — do not assume the back is newer.",
      "New stock goes behind, dated stock goes in front, labels facing out.",
      "Anything within seven days of code goes to the markdown cart, not back on the shelf.",
    ],
  },
  {
    id: "sug_2",
    stepId: "step_k1",
    stepTitle: "What counts as a TCS food",
    moduleId: "mod_kitchen_food_safety",
    submittedBy: "Wells Struble",
    submittedRole: "Owner",
    submittedOn: "Jul 31",
    status: "pending",
    whatIsTheStep: "Identifying which foods on our line are TCS.",
    howIsItDone:
      "Walk the line and name each pan: cooked grains, cut melon, dairy, eggs, proteins, and cooked vegetables are all TCS. Add cut tomatoes and cooked pasta — both come up weekly and aren't on the current list.",
    howDoYouKnow:
      "A new hire can point at any pan on the line and say TCS or not, and give the holding temp for it.",
    currentBody: [
      "TCS = time/temperature control for safety.",
      "Cooked grains, cut melon, dairy, eggs, and all proteins are TCS.",
      "Cold holding at 41°F or below. Hot holding at 135°F or above.",
      "The zone between those two numbers is where you lose product and get people sick.",
    ],
  },
  {
    id: "sug_3",
    stepId: "step_h1",
    stepTitle: "The 10-foot greeting",
    moduleId: "mod_hospitality_day1",
    submittedBy: "Dana Whitfield",
    submittedRole: "Kitchen Ops Manager",
    submittedOn: "Aug 1",
    status: "pending",
    whatIsTheStep: "Greeting guests from the kitchen pass, not just the floor.",
    howIsItDone:
      "Kitchen staff at the pass greet anyone who steps up to the counter — the floor rule applies behind the line too.",
    howDoYouKnow: "No guest stands at the pass for more than a few seconds without being spoken to.",
    currentBody: [
      "Notice every guest within ten feet of you, even if your hands are full.",
      "Make eye contact and greet them out loud — a nod is not a greeting.",
      "If you cannot stop what you're doing, say so and name who can help them.",
      "Never point. Walk the guest to what they're looking for.",
    ],
  },
];

export interface VersionEntry {
  id: string;
  stepId: string;
  editedBy: string;
  editedOn: string;
  summary: string;
}

export const mockVersionHistory: VersionEntry[] = [
  {
    id: "ver_1",
    stepId: "step_s1",
    editedBy: "Sven Wallin",
    editedOn: "Jul 24, 2026",
    summary: "Added the markdown-cart rule to the last line.",
  },
  {
    id: "ver_2",
    stepId: "step_s1",
    editedBy: "Andrew Cameron",
    editedOn: "Jul 11, 2026",
    summary: "Rewrote steps 1–3 as numbered instructions.",
  },
  {
    id: "ver_3",
    stepId: "step_k3",
    editedBy: "Sven Wallin",
    editedOn: "Jun 30, 2026",
    summary: "Marked blocked pending CFPM certificate confirmation.",
  },
];

export const stepTypeOptions: StepType[] = [
  "text",
  "photo",
  "video",
  "quiz",
  "doing_signoff",
  "supervised_live_practice",
];

export const contentStatusOptions: ContentStatus[] = [
  "ready",
  "needs_restructuring",
  "missing",
  "blocked",
];