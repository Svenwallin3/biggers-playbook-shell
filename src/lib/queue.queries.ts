import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { EmployeeRow } from "@/lib/admin.queries";
import {
  compareModulesByDay,
  departmentsForEmployee,
  getDayGroupedSteps,
  moduleVisibleForSubPath,
  trainerSignoffTypes,
  type Department,
  type ModuleRow,
  type StepRow,
  type TrackRow,
} from "@/lib/training.queries";

export type QueueEntry = {
  employee: EmployeeRow;
  track: TrackRow | null;
  module: ModuleRow | null;
  step: StepRow | null;
  /** True when the next step can only be completed with a trainer present. */
  needsTrainer: boolean;
  /** Progress row id for the next step, when one already exists. */
  progressId: string | null;
  completed: number;
  total: number;
};

export type OnboardingProgress = { completed: number; total: number };

/**
 * Per-employee required-onboarding completion, keyed by employee id.
 * Assignable modules (Forklift, Bartender, etc.) sit outside the required
 * 4-day onboarding and are excluded from the totals.
 */
export function onboardingCompletionQueryOptions() {
  return queryOptions({
    queryKey: ["onboarding-completion"],
    queryFn: async (): Promise<Record<string, OnboardingProgress>> => {
      const [employeesRes, tracksRes, modulesRes, stepsRes, progressRes] = await Promise.all([
        supabase.from("employees").select("id, department_scope, sub_path").eq("is_deleted", false),
        supabase.from("tracks").select("*").eq("is_deleted", false),
        supabase
          .from("modules")
          .select("*")
          .eq("is_deleted", false)
          .eq("is_assignable", false)
          .order("sequence_order"),
        supabase.from("steps").select("*").eq("is_deleted", false).order("sequence_order"),
        supabase.from("progress_records").select("employee_id, step_id, status"),
      ]);
      if (employeesRes.error) throw employeesRes.error;
      if (tracksRes.error) throw tracksRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (stepsRes.error) throw stepsRes.error;
      if (progressRes.error) throw progressRes.error;

      const done = new Set(
        (progressRes.data ?? [])
          .filter((r) => r.status === "completed" || r.status === "signed_off")
          .map((r) => `${r.employee_id}:${r.step_id}`),
      );
      const trackById = new Map((tracksRes.data ?? []).map((t) => [t.id, t]));
      const stepsByModule = new Map<string, StepRow[]>();
      for (const s of stepsRes.data ?? []) {
        const list = stepsByModule.get(s.module_id) ?? [];
        list.push(s);
        stepsByModule.set(s.module_id, list);
      }
      const modules = (modulesRes.data ?? [])
        .map((m) => ({ ...m, track: trackById.get(m.track_id) ?? null }))
        .filter((m) => m.track);

      const out: Record<string, OnboardingProgress> = {};
      for (const employee of employeesRes.data ?? []) {
        const depts = departmentsForEmployee(employee.department_scope);
        let total = 0;
        let completed = 0;
        for (const m of modules) {
          if (!depts.includes(m.track!.department)) continue;
          if (!moduleVisibleForSubPath(m, employee.sub_path)) continue;
          for (const step of stepsByModule.get(m.id) ?? []) {
            total += 1;
            if (done.has(`${employee.id}:${step.id}`)) completed += 1;
          }
        }
        out[employee.id] = { completed, total };
      }
      return out;
    },
  });
}

/**
 * Each active employee's next incomplete step, in track / day / module / step order.
 * Managers see their own department; owners see everyone.
 */
export function trainingQueueQueryOptions(scope: {
  department: Department | null;
  isOwner: boolean;
  locationId?: string | null;
}) {
  return queryOptions({
    queryKey: [
      "training-queue",
      scope.isOwner ? "all" : (scope.department ?? "none"),
      scope.isOwner ? "all" : (scope.locationId ?? "any"),
    ],
    queryFn: async (): Promise<QueueEntry[]> => {
      const [employeesRes, tracksRes, modulesRes, stepsRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*")
          .eq("is_deleted", false)
          .eq("status", "active")
          .order("full_name", { nullsFirst: false }),
        supabase.from("tracks").select("*").eq("is_deleted", false).order("sequence_order"),
        supabase.from("modules").select("*").eq("is_deleted", false).order("sequence_order"),
        supabase.from("steps").select("*").eq("is_deleted", false).order("sequence_order"),
      ]);
      if (employeesRes.error) throw employeesRes.error;
      if (tracksRes.error) throw tracksRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (stepsRes.error) throw stepsRes.error;

      let employees = employeesRes.data ?? [];
      if (!scope.isOwner) {
        employees = employees.filter((e) => {
          const depts = departmentsForEmployee(e.department_scope);
          if (!scope.department || !depts.includes(scope.department)) return false;
          // Market runs two sites — a Market manager with a location only sees their own.
          if (scope.department === "market" && scope.locationId) {
            return e.location_id === scope.locationId;
          }
          return true;
        });
      }
      if (!employees.length) return [];

      const { data: progress, error: progressError } = await supabase
        .from("progress_records")
        .select("id, employee_id, step_id, status")
        .in(
          "employee_id",
          employees.map((e) => e.id),
        );
      if (progressError) throw progressError;

      const done = new Set(
        (progress ?? [])
          .filter((r) => r.status === "completed" || r.status === "signed_off")
          .map((r) => `${r.employee_id}:${r.step_id}`),
      );
      const progressIds = new Map(
        (progress ?? []).map((r) => [`${r.employee_id}:${r.step_id}`, r.id]),
      );

      const tracks = tracksRes.data ?? [];
      const trackById = new Map(tracks.map((t) => [t.id, t]));
      const stepsByModule = new Map<string, StepRow[]>();
      for (const s of stepsRes.data ?? []) {
        const list = stepsByModule.get(s.module_id) ?? [];
        list.push(s);
        stepsByModule.set(s.module_id, list);
      }

      const orderedModules = (modulesRes.data ?? [])
        .map((m) => ({ ...m, track: trackById.get(m.track_id) ?? null }))
        .filter((m) => m.track)
        .sort(compareModulesByDay);

      return employees.map((employee) => {
        const depts = departmentsForEmployee(employee.department_scope);
        const mods = orderedModules.filter(
          (m) =>
            depts.includes(m.track!.department) && moduleVisibleForSubPath(m, employee.sub_path),
        );

        let total = 0;
        let completed = 0;
        let next: { track: TrackRow; module: ModuleRow; step: StepRow } | null = null;

        const withSteps = mods.map((m) => ({
          ...m,
          steps: [...(stepsByModule.get(m.id) ?? [])].sort(
            (a, b) => a.sequence_order - b.sequence_order,
          ),
        }));

        for (const { module: m, step } of getDayGroupedSteps(withSteps)) {
          total += 1;
          if (done.has(`${employee.id}:${step.id}`)) {
            completed += 1;
          } else if (!next) {
            next = { track: m.track!, module: m, step };
          }
        }

        return {
          employee,
          track: next?.track ?? null,
          module: next?.module ?? null,
          step: next?.step ?? null,
          needsTrainer: next ? trainerSignoffTypes.includes(next.step.step_type) : false,
          progressId: next ? (progressIds.get(`${employee.id}:${next.step.id}`) ?? null) : null,
          completed,
          total,
        };
      });
    },
  });
}
