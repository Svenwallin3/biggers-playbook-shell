import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ModuleRow, StepRow, TrackRow } from "@/lib/training.queries";

export type SuggestionRow = Database["public"]["Tables"]["suggestion_queue"]["Row"];
export type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
export type VersionRow = Database["public"]["Tables"]["version_history"]["Row"];
export type AssignmentRow = Database["public"]["Tables"]["assignable_module_assignments"]["Row"];

export type ContentTree = {
  tracks: TrackRow[];
  modules: (ModuleRow & { track: TrackRow | undefined })[];
  steps: StepRow[];
};

/** Full content tree including soft-deleted rows (managers/owners can read those). */
export function contentTreeQueryOptions() {
  return queryOptions({
    queryKey: ["content-tree"],
    queryFn: async (): Promise<ContentTree> => {
      const [tracksRes, modulesRes, stepsRes] = await Promise.all([
        supabase.from("tracks").select("*").order("sequence_order"),
        supabase.from("modules").select("*").order("sequence_order"),
        supabase.from("steps").select("*").order("sequence_order"),
      ]);
      if (tracksRes.error) throw tracksRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (stepsRes.error) throw stepsRes.error;

      const tracks = tracksRes.data ?? [];
      return {
        tracks,
        modules: (modulesRes.data ?? []).map((m) => ({
          ...m,
          track: tracks.find((t) => t.id === m.track_id),
        })),
        steps: stepsRes.data ?? [],
      };
    },
  });
}

export type SuggestionWithContext = SuggestionRow & {
  step: (StepRow & { module: (ModuleRow & { track: TrackRow | null }) | null }) | null;
  submitter: Pick<EmployeeRow, "id" | "full_name" | "email" | "auth_tier"> | null;
};

export function suggestionsQueryOptions(status: Database["public"]["Enums"]["suggestion_status"]) {
  return queryOptions({
    queryKey: ["suggestions", status],
    queryFn: async (): Promise<SuggestionWithContext[]> => {
      const { data, error } = await supabase
        .from("suggestion_queue")
        .select(
          "*, step:steps(*, module:modules(*, track:tracks(*))), submitter:employees!suggestion_queue_submitted_by_fkey(id, full_name, email, auth_tier)",
        )
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SuggestionWithContext[];
    },
  });
}

export function versionHistoryQueryOptions(entityType: string, entityId: string | undefined) {
  return queryOptions({
    queryKey: ["version-history", entityType, entityId],
    enabled: Boolean(entityId),
    queryFn: async (): Promise<VersionRow[]> => {
      const { data, error } = await supabase
        .from("version_history")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function employeesQueryOptions() {
  return queryOptions({
    queryKey: ["employees"],
    queryFn: async (): Promise<EmployeeRow[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function employeeStatsQueryOptions(employeeId: string | undefined) {
  return queryOptions({
    queryKey: ["employee-stats", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const [progress, attempts, suggestions] = await Promise.all([
        supabase
          .from("progress_records")
          .select("id, step_id, status", { count: "exact" })
          .eq("employee_id", employeeId!),
        supabase
          .from("quiz_attempts")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", employeeId!),
        supabase
          .from("suggestion_queue")
          .select("id", { count: "exact", head: true })
          .eq("submitted_by", employeeId!),
      ]);
      if (progress.error) throw progress.error;
      if (attempts.error) throw attempts.error;
      if (suggestions.error) throw suggestions.error;
      const rows = progress.data ?? [];
      return {
        progressCount: rows.length,
        completedStepIds: rows
          .filter((r) => r.status === "completed" || r.status === "signed_off")
          .map((r) => r.step_id),
        quizAttempts: attempts.count ?? 0,
        suggestions: suggestions.count ?? 0,
      };
    },
  });
}

export type AssignmentWithContext = AssignmentRow & {
  employee: Pick<EmployeeRow, "id" | "full_name" | "email" | "department_scope"> | null;
  module: (ModuleRow & { track: TrackRow | null }) | null;
};

/** Restricted / assignable modules (forklift, alcohol receiving, …) and who holds them. */
export function assignmentsQueryOptions() {
  return queryOptions({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignable_module_assignments")
        .select(
          "*, employee:employees!assignable_module_assignments_employee_id_fkey(id, full_name, email, department_scope), module:modules(*, track:tracks(*))",
        )
        .eq("is_deleted", false)
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as AssignmentWithContext[];

      const moduleIds = [...new Set(rows.map((r) => r.module_id))];
      const employeeIds = [...new Set(rows.map((r) => r.employee_id))];
      if (!moduleIds.length) return { rows, completion: new Map<string, { done: number; total: number }>() };

      const { data: steps, error: stepError } = await supabase
        .from("steps")
        .select("id, module_id")
        .in("module_id", moduleIds)
        .eq("is_deleted", false);
      if (stepError) throw stepError;

      const stepIds = (steps ?? []).map((s) => s.id);
      let records: { employee_id: string; step_id: string; status: string }[] = [];
      if (stepIds.length && employeeIds.length) {
        const { data: progress, error: progressError } = await supabase
          .from("progress_records")
          .select("employee_id, step_id, status")
          .in("step_id", stepIds)
          .in("employee_id", employeeIds);
        if (progressError) throw progressError;
        records = progress ?? [];
      }

      const completion = new Map<string, { done: number; total: number }>();
      for (const row of rows) {
        const moduleSteps = (steps ?? []).filter((s) => s.module_id === row.module_id);
        const done = moduleSteps.filter((s) =>
          records.some(
            (r) =>
              r.employee_id === row.employee_id &&
              r.step_id === s.id &&
              (r.status === "completed" || r.status === "signed_off"),
          ),
        ).length;
        completion.set(row.id, { done, total: moduleSteps.length });
      }

      return { rows, completion };
    },
  });
}
