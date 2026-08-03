export type CertType = "CFPM" | "ServSafe Food Handler";

export interface CertHolder {
  id: string;
  name: string;
  role: string;
  cert: CertType;
  certNumber: string;
  expires: string; // ISO date
}

export const certHolders: CertHolder[] = [
  {
    id: "cert_1",
    name: "Dana Whitfield",
    role: "Kitchen Ops Manager",
    cert: "CFPM",
    certNumber: "NC-CFPM-40128",
    expires: "2028-04-12",
  },
  {
    id: "cert_2",
    name: "Marcus Hale",
    role: "Lead Cook (Weekday Production)",
    cert: "CFPM",
    certNumber: "NC-CFPM-39877",
    expires: "2026-09-30",
  },
  {
    id: "cert_3",
    name: "Priya Raman",
    role: "Baker (floats both)",
    cert: "ServSafe Food Handler",
    certNumber: "SS-FH-771204",
    expires: "2027-01-18",
  },
  {
    id: "cert_4",
    name: "Tessa Boyd",
    role: "Weekend Service Lead",
    cert: "CFPM",
    certNumber: "NC-CFPM-41290",
    expires: "2026-08-21",
  },
  {
    id: "cert_5",
    name: "Jordan Reyes",
    role: "Market Associate",
    cert: "ServSafe Food Handler",
    certNumber: "SS-FH-802551",
    expires: "2026-11-05",
  },
];

export type ShiftBlock = "weekday_production" | "weekend_service";

export interface ScheduleDay {
  day: string;
  block: ShiftBlock;
  staffIds: string[];
}

/** Mon–Thu = weekday production, Fri–Sun = weekend service. */
export const kitchenSchedule: ScheduleDay[] = [
  { day: "Monday", block: "weekday_production", staffIds: ["cert_2", "cert_3"] },
  { day: "Tuesday", block: "weekday_production", staffIds: ["cert_1", "cert_2"] },
  { day: "Wednesday", block: "weekday_production", staffIds: ["cert_3"] },
  { day: "Thursday", block: "weekday_production", staffIds: ["cert_2"] },
  { day: "Friday", block: "weekend_service", staffIds: ["cert_4", "cert_3"] },
  { day: "Saturday", block: "weekend_service", staffIds: ["cert_4"] },
  { day: "Sunday", block: "weekend_service", staffIds: ["cert_3", "cert_5"] },
];

export const blockLabels: Record<ShiftBlock, string> = {
  weekday_production: "Weekday production (Mon–Thu)",
  weekend_service: "Weekend service (Fri–Sun)",
};

export function certExpiryState(expires: string, today = new Date("2026-08-03")) {
  const exp = new Date(expires);
  const days = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired" as const;
  if (days <= 90) return "expiring" as const;
  return "current" as const;
}

/** Mock employee profiles for the account merge tool. */
export interface MergeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "active" | "inactive";
  createdOn: string;
  lastSeen: string;
  completedStepIds: string[];
  signoffs: { skill: string; by: string; on: string }[];
}

export const mergeProfiles: MergeProfile[] = [
  {
    id: "emp_1042",
    name: "Jordan Reyes",
    email: "jordan.reyes@biggersmarket.com",
    department: "Market",
    status: "active",
    createdOn: "Feb 14, 2026",
    lastSeen: "Aug 2, 2026",
    completedStepIds: ["step_h1", "step_h2", "step_s1"],
    signoffs: [{ skill: "Stocking sign-off", by: "Andrew Cameron", on: "Jul 8, 2026" }],
  },
  {
    id: "emp_1188",
    name: "Jordan R.",
    email: "jreyes@biggersmarket.com",
    department: "Market",
    status: "active",
    createdOn: "Jun 2, 2026",
    lastSeen: "Jul 30, 2026",
    completedStepIds: ["step_h1", "step_s2", "step_s3"],
    signoffs: [{ skill: "Day 4: Supervised guest interactions", by: "Sven Wallin", on: "Jul 22, 2026" }],
  },
  {
    id: "emp_1201",
    name: "Marcus Hale",
    email: "marcus.hale@biggersmarket.com",
    department: "Kitchen",
    status: "active",
    createdOn: "Jan 9, 2026",
    lastSeen: "Aug 1, 2026",
    completedStepIds: ["step_k1", "step_k2"],
    signoffs: [{ skill: "Temp log sign-off", by: "Dana Whitfield", on: "Mar 3, 2026" }],
  },
  {
    id: "emp_1233",
    name: "M. Hale (kitchen tablet)",
    email: "kitchen-tablet+hale@biggersmarket.com",
    department: "Kitchen",
    status: "inactive",
    createdOn: "Apr 18, 2026",
    lastSeen: "May 27, 2026",
    completedStepIds: ["step_k1", "step_k4"],
    signoffs: [],
  },
];