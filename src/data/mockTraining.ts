export type StepType =
  | "text"
  | "photo"
  | "video"
  | "quiz"
  | "doing_signoff"
  | "supervised_live_practice";

export type ContentStatus = "ready" | "needs_restructuring" | "missing" | "blocked";

export type Track = "universal" | "market" | "kitchen" | "delivery";

export interface Step {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  step_type: StepType;
  content_status: ContentStatus;
  content_notes?: string;
  location_tag: string;
  body?: string[];
  photoCaption?: string;
  videoLength?: string;
  quiz?: { question: string; options: string[]; answerIndex: number };
  signoffBy?: string;
}

export interface Module {
  id: string;
  track: Track;
  trackLabel: string;
  sub_path?: string;
  title: string;
  summary: string;
  day_assignment: string;
  is_assignable: boolean;
  location_tag: string;
}

export const mockEmployee = {
  id: "emp_1042",
  name: "Jordan Reyes",
  auth_tier: "staff" as const,
  department_scope: "market",
  location_id: "loc_biggers_main",
  path: "Market",
  status: "active" as const,
  startedOn: "Day 2",
};

export const modules: Module[] = [
  {
    id: "mod_hospitality_day1",
    track: "universal",
    trackLabel: "Universal / Hospitality",
    title: "Day 1: Hospitality at Biggers",
    summary: "How we greet, help, and hand off every guest who walks in.",
    day_assignment: "Day 1",
    is_assignable: false,
    location_tag: "loc_biggers_main",
  },
  {
    id: "mod_market_stocking",
    track: "market",
    trackLabel: "Market",
    sub_path: "Stocking",
    title: "Stocking the Floor",
    summary: "Rotation, facing, and shelf standards for the retail floor.",
    day_assignment: "Day 2",
    is_assignable: true,
    location_tag: "loc_biggers_main",
  },
  {
    id: "mod_kitchen_food_safety",
    track: "kitchen",
    trackLabel: "Kitchen",
    sub_path: "Weekday Production",
    title: "Food Safety Basics (TCS & CFPM)",
    summary: "Temperature control, holding times, and who must be on-site.",
    day_assignment: "Day 1",
    is_assignable: true,
    location_tag: "loc_biggers_main",
  },
];

export const steps: Step[] = [
  {
    id: "step_h1",
    moduleId: "mod_hospitality_day1",
    order: 1,
    title: "The 10-foot greeting",
    step_type: "text",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "Notice every guest within ten feet of you, even if your hands are full.",
      "Make eye contact and greet them out loud — a nod is not a greeting.",
      "If you cannot stop what you're doing, say so and name who can help them.",
      "Never point. Walk the guest to what they're looking for.",
    ],
  },
  {
    id: "step_h2",
    moduleId: "mod_hospitality_day1",
    order: 2,
    title: "Reading the front-of-house at a glance",
    step_type: "photo",
    content_status: "needs_restructuring",
    content_notes: "Source photos exist in the old Drive folder; captions need rewriting.",
    location_tag: "loc_biggers_main",
    photoCaption: "Front counter set for open — registers staffed, bag station stocked.",
    body: ["Scan the entry, the counter, and the pickup shelf in that order before you clock in."],
  },
  {
    id: "step_h3",
    moduleId: "mod_hospitality_day1",
    order: 3,
    title: "Handling an unhappy guest",
    step_type: "video",
    content_status: "missing",
    content_notes: "Needs a 60-sec clip. Sven to record with Andrew on a slow weekday.",
    location_tag: "loc_biggers_main",
  },
  {
    id: "step_h4",
    moduleId: "mod_hospitality_day1",
    order: 4,
    title: "Day 4: Supervised guest interactions",
    step_type: "supervised_live_practice",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "Work the floor with your trainer for a full shift with real customers.",
      "Your trainer stays within earshot but does not step in unless asked.",
      "Debrief three interactions at the end of the shift.",
    ],
    signoffBy: "Store GM",
  },
  {
    id: "step_s1",
    moduleId: "mod_market_stocking",
    order: 1,
    title: "FIFO rotation on the dry shelf",
    step_type: "text",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "Pull existing product forward before anything new goes on the shelf.",
      "Check the date on every unit you pull — do not assume the back is newer.",
      "New stock goes behind, dated stock goes in front, labels facing out.",
      "Anything within seven days of code goes to the markdown cart, not back on the shelf.",
    ],
  },
  {
    id: "step_s2",
    moduleId: "mod_market_stocking",
    order: 2,
    title: "What a faced shelf looks like",
    step_type: "photo",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    photoCaption: "Correct: labels square to the aisle, front row flush to the shelf edge.",
    body: ["Compare your section to this before you call it done."],
  },
  {
    id: "step_s3",
    moduleId: "mod_market_stocking",
    order: 3,
    title: "Breaking down a pallet safely",
    step_type: "video",
    content_status: "needs_restructuring",
    content_notes: "Old clip is 6 minutes; needs to be cut to one 90-second skill clip.",
    location_tag: "loc_biggers_main",
    videoLength: "1:30",
  },
  {
    id: "step_s4",
    moduleId: "mod_market_stocking",
    order: 4,
    title: "Stocking sign-off",
    step_type: "doing_signoff",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "Stock and face one full aisle end-to-end without prompting.",
      "Trainer checks rotation on five random units.",
    ],
    signoffBy: "Store GM",
  },
  {
    id: "step_k1",
    moduleId: "mod_kitchen_food_safety",
    order: 1,
    title: "What counts as a TCS food",
    step_type: "text",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "TCS = time/temperature control for safety.",
      "Cooked grains, cut melon, dairy, eggs, and all proteins are TCS.",
      "Cold holding at 41°F or below. Hot holding at 135°F or above.",
      "The zone between those two numbers is where you lose product and get people sick.",
    ],
  },
  {
    id: "step_k2",
    moduleId: "mod_kitchen_food_safety",
    order: 2,
    title: "Holding-time quiz",
    step_type: "quiz",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    quiz: {
      question:
        "A pan of cooked rice has been sitting at room temperature for five hours. What do you do?",
      options: [
        "Reheat it to 165°F and put it back in service",
        "Discard it and log the waste",
        "Move it to the walk-in and use it tomorrow",
      ],
      answerIndex: 1,
    },
  },
  {
    id: "step_k3",
    moduleId: "mod_kitchen_food_safety",
    order: 3,
    title: "CFPM coverage requirements (NC)",
    step_type: "text",
    content_status: "blocked",
    content_notes:
      "Blocked: waiting on confirmation of which managers hold a current CFPM certificate.",
    location_tag: "loc_biggers_main",
  },
  {
    id: "step_k4",
    moduleId: "mod_kitchen_food_safety",
    order: 4,
    title: "Temp log sign-off",
    step_type: "doing_signoff",
    content_status: "ready",
    location_tag: "loc_biggers_main",
    body: [
      "Take and record a full line temp log unassisted.",
      "Kitchen Ops Manager verifies the readings against their own probe.",
    ],
    signoffBy: "Kitchen Ops Manager",
  },
];

export interface SourcingEntry {
  id: string;
  item: string;
  supplier: string;
  note: string;
  /** Origin / region the product comes from. */
  region: string;
  /** Month + year we started carrying it. */
  since: string;
}

export const sourcingBoard: SourcingEntry[] = [
  {
    id: "src_1",
    item: "Stone-ground grits",
    supplier: "Old Mill of Guilford",
    note: "Sacked weekly, picked up Thursdays.",
    region: "Oak Ridge, NC",
    since: "Mar 2021",
  },
  {
    id: "src_2",
    item: "Pasture eggs",
    supplier: "Rocky Creek Farm",
    note: "Seasonal volume — short in January.",
    region: "Siler City, NC",
    since: "Jun 2022",
  },
  {
    id: "src_3",
    item: "Sourdough loaves",
    supplier: "In-house bakery",
    note: "Baker floats weekday production and weekend service.",
    region: "In-house",
    since: "Jan 2020",
  },
  {
    id: "src_4",
    item: "Heirloom tomatoes",
    supplier: "Sunset Ridge Produce",
    note: "Peak July–September; hothouse fill-in the rest of the year.",
    region: "Rutherford County, NC",
    since: "Jul 2021",
  },
  {
    id: "src_5",
    item: "Collards & kale",
    supplier: "Wake Greens Co-op",
    note: "Twice-weekly cut, best after the first frost.",
    region: "Wake County, NC",
    since: "Oct 2020",
  },
  {
    id: "src_6",
    item: "Sweet potatoes",
    supplier: "Nash County Growers",
    note: "Cured in-house for two weeks before they hit the floor.",
    region: "Nash County, NC",
    since: "Sep 2019",
  },
  {
    id: "src_7",
    item: "Muscadine grapes",
    supplier: "Duplin Vineyard Farms",
    note: "Six-week window only — don't promise them year-round.",
    region: "Duplin County, NC",
    since: "Aug 2023",
  },
  {
    id: "src_8",
    item: "Apples (Gala, Rome)",
    supplier: "Hendersonville Orchards",
    note: "Mountain fruit, arrives Tuesdays through November.",
    region: "Henderson County, NC",
    since: "Sep 2020",
  },
];

export function stepsForModule(moduleId: string) {
  return steps.filter((s) => s.moduleId === moduleId).sort((a, b) => a.order - b.order);
}

export function moduleById(id: string) {
  return modules.find((m) => m.id === id);
}

/** Mock progress: which step ids the employee has completed. */
export const completedStepIds = new Set(["step_h1", "step_h2", "step_s1"]);

/** Today's assigned sequence for the mock employee. */
export const todaysModuleIds = [
  "mod_hospitality_day1",
  "mod_market_stocking",
  "mod_kitchen_food_safety",
];

export const stepTypeLabels: Record<StepType, string> = {
  text: "Written steps",
  photo: "Photo",
  video: "Video",
  quiz: "Quiz",
  doing_signoff: "Trainer sign-off",
  supervised_live_practice: "Supervised live practice",
};