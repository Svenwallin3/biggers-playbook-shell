import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Department, SecondaryDivision } from "@/lib/training.queries";

export type SecondaryDivisionRow = {
  id: string;
  employee_id: string;
  department: Department;
  path_id: string | null;
  created_at: string;
};

/**
 * Active cross-training rows, grouped by employee. RLS already limits what the
 * caller can see (own rows, or everything for managers/owners), so this is a
 * single fetch shared by the plan, the queue and the team screen.
 */
export function secondaryDivisionsQueryOptions() {
  return queryOptions({
    queryKey: ["secondary-divisions"],
    queryFn: async (): Promise<Record<string, SecondaryDivisionRow[]>> => {
      const { data, error } = await supabase
        .from("employee_secondary_divisions")
        .select("id, employee_id, department, path_id, created_at")
        .eq("is_deleted", false)
        .order("created_at");
      if (error) throw error;
      const out: Record<string, SecondaryDivisionRow[]> = {};
      for (const row of (data ?? []) as SecondaryDivisionRow[]) {
        (out[row.employee_id] ??= []).push(row);
      }
      return out;
    },
  });
}

/** Active cross-training rows for one employee. */
export function employeeSecondaryDivisionsQueryOptions(employeeId: string | null | undefined) {
  return queryOptions({
    queryKey: ["secondary-divisions", employeeId ?? "none"],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<SecondaryDivisionRow[]> => {
      const { data, error } = await supabase
        .from("employee_secondary_divisions")
        .select("id, employee_id, department, path_id, created_at")
        .eq("employee_id", employeeId!)
        .eq("is_deleted", false)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as SecondaryDivisionRow[];
    },
  });
}

export function toSecondaryDivisions(rows: SecondaryDivisionRow[] | undefined): SecondaryDivision[] {
  return (rows ?? []).map((r) => ({ department: r.department, path_id: r.path_id }));
}

export async function addSecondaryDivision(input: {
  employeeId: string;
  department: Department;
  pathId: string | null;
  assignedBy: string | null;
}) {
  const { error } = await supabase.from("employee_secondary_divisions").insert({
    employee_id: input.employeeId,
    department: input.department,
    path_id: input.pathId,
    assigned_by: input.assignedBy,
  });
  if (error) throw error;
}

export async function endSecondaryDivision(input: { id: string; endedBy: string | null }) {
  const { error } = await supabase
    .from("employee_secondary_divisions")
    .update({
      is_deleted: true,
      deleted_by: input.endedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}
