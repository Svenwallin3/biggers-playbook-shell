import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { EmployeeRow } from "@/lib/admin.queries";
import {
  trainerSignoffTypes,
  type Department,
  type ModuleRow,
  type StepRow,
  type TrackRow,
} from "@/lib/training.queries";

const OVERDUE_HOURS = 48;

function primaryDepartment(path: string | null): Department {
  const p = (path ?? "").toLowerCase();
  if (p.startsWith("kitchen")) return "kitchen";
  if (p.startsWith("deliver")) return "delivery";
  if (p.startsWith("market")) return "market";
  return "universal";
}

function departmentsForPath(path: string | null): Department[] {
  const primary = primaryDepartment(path);
  return primary === "universal" ? ["universal"] : ["universal", primary];
}

export type BacklogItem = {
  employee: EmployeeRow;
  step: StepRow;
  module: ModuleRow;
  track: TrackRow;
  /** When the employee reached this step and started waiting on a trainer. */
  waitingSince: string;
  hoursWaiting: number;
};

export type BacklogGroup = {
  department: Department;
  managers: string[];
  overdueCount: number;
  longest: BacklogItem | null;
};

export type SignoffBacklog = {
  groups: BacklogGroup[];
  totalOverdue: number;
  thresholdHours: number;
};

/**
 * Owner-level pattern view: overdue trainer sign-offs grouped by department /
 * responsible manager. A sign-off counts as overdue once the employee has been
 * sitting on that step for more than 48 hours.
 */
export function signoffBacklogQueryOptions() {
  return queryOptions({
    queryKey: ["signoff-backlog"],
    queryFn: async (): Promise<SignoffBacklog> => {
      const [employeesRes, tracksRes, modulesRes, stepsRes] = await Promise.all([
        supabase.from("employees").select("*").eq("is_deleted", false).eq("status", "active"),
        supabase.from("tracks").select("*").eq("is_deleted", false).order("sequence_order"),
        supabase.from("modules").select("*").eq("is_deleted", false).order("sequence_order"),
        supabase.from("steps").select("*").eq("is_deleted", false).order("sequence_order"),
      ]);
      if (employeesRes.error) throw employeesRes.error;
      if (tracksRes.error) throw tracksRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (stepsRes.error) throw stepsRes.error;

      const employees = employeesRes.data ?? [];
      const trainees = employees.filter((e) => e.auth_tier === "staff");
      const managers = employees.filter(
        (e) => e.auth_tier === "manager" || e.auth_tier === "owner",
      );

      const progressRes = trainees.length
        ? await supabase
            .from("progress_records")
            .select("employee_id, step_id, status, started_at, completed_at, updated_at, created_at")
            .in(
              "employee_id",
              trainees.map((e) => e.id),
            )
        : { data: [], error: null };
      if (progressRes.error) throw progressRes.error;
      const progress = progressRes.data ?? [];

      const byKey = new Map(progress.map((r) => [`${r.employee_id}:${r.step_id}`, r]));
      const isDone = (r?: (typeof progress)[number]) =>
        r?.status === "completed" || r?.status === "signed_off";

      const trackById = new Map((tracksRes.data ?? []).map((t) => [t.id, t]));
      const stepsByModule = new Map<string, StepRow[]>();
      for (const s of stepsRes.data ?? []) {
        const list = stepsByModule.get(s.module_id) ?? [];
        list.push(s);
        stepsByModule.set(s.module_id, list);
      }

      const orderedModules = (modulesRes.data ?? [])
        .map((m) => ({ ...m, track: trackById.get(m.track_id) ?? null }))
        .filter((m) => m.track)
        .sort((a, b) => {
          if (a.track!.department === "universal" && b.track!.department !== "universal") return -1;
          if (b.track!.department === "universal" && a.track!.department !== "universal") return 1;
          const day = (a.day_assignment ?? 99) - (b.day_assignment ?? 99);
          if (day !== 0) return day;
          const dept = a.track!.sequence_order - b.track!.sequence_order;
          if (dept !== 0) return dept;
          return a.sequence_order - b.sequence_order;
        });

      const now = Date.now();
      const items: BacklogItem[] = [];

      for (const employee of trainees) {
        const depts = departmentsForPath(employee.path);
        const mods = orderedModules.filter((m) => depts.includes(m.track!.department));

        let lastCompletedAt: string | null = null;
        let found = false;

        for (const m of mods) {
          if (found) break;
          const steps = [...(stepsByModule.get(m.id) ?? [])].sort(
            (a, b) => a.sequence_order - b.sequence_order,
          );
          for (const step of steps) {
            const record = byKey.get(`${employee.id}:${step.id}`);
            if (isDone(record)) {
              lastCompletedAt = record?.completed_at ?? record?.updated_at ?? lastCompletedAt;
              continue;
            }
            found = true;
            if (!trainerSignoffTypes.includes(step.step_type)) break;
            // When the employee reached this step: the step's own start, else the
            // moment they finished the previous one, else their start date.
            const waitingSince =
              record?.started_at ??
              record?.created_at ??
              lastCompletedAt ??
              employee.created_at;
            const hoursWaiting = (now - new Date(waitingSince).getTime()) / 3_600_000;
            if (hoursWaiting > OVERDUE_HOURS) {
              items.push({
                employee,
                step,
                module: m,
                track: m.track!,
                waitingSince,
                hoursWaiting,
              });
            }
            break;
          }
        }
      }

      const depts = new Set<Department>(items.map((i) => primaryDepartment(i.employee.path)));
      const groups: BacklogGroup[] = [...depts]
        .map((department) => {
          const group = items.filter((i) => primaryDepartment(i.employee.path) === department);
          const longest = group.reduce<BacklogItem | null>(
            (acc, i) => (!acc || i.hoursWaiting > acc.hoursWaiting ? i : acc),
            null,
          );
          return {
            department,
            managers: managers
              .filter((m) => m.department_scope === department)
              .map((m) => m.full_name ?? m.email),
            overdueCount: group.length,
            longest,
          };
        })
        .sort((a, b) => b.overdueCount - a.overdueCount);

      return {
        groups,
        totalOverdue: items.length,
        thresholdHours: OVERDUE_HOURS,
      };
    },
  });
}
