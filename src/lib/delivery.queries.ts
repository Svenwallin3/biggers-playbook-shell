import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DeliveryIssueRow = Database["public"]["Tables"]["delivery_issues"]["Row"];

export type DeliveryIssueWithPeople = DeliveryIssueRow & {
  reporter: { id: string; full_name: string | null; email: string } | null;
  assignee: { id: string; full_name: string | null; email: string } | null;
};

const withPeople =
  "*, reporter:employees!delivery_issues_reported_by_fkey(id, full_name, email), assignee:employees!delivery_issues_assigned_to_fkey(id, full_name, email)";

/** Managers and owners who can be assigned a delivery issue. */
export function assignableStaffQueryOptions() {
  return queryOptions({
    queryKey: ["assignable-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, auth_tier, department_scope")
        .in("auth_tier", ["manager", "owner"])
        .eq("is_deleted", false)
        .eq("status", "active")
        .order("full_name", { nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Open delivery issues assigned to a given employee (for the landing-page view). */
export function openIssuesForEmployeeQueryOptions(employeeId: string | null | undefined) {
  return queryOptions({
    queryKey: ["delivery-issues", "open", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<DeliveryIssueWithPeople[]> => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("delivery_issues")
        .select(withPeople)
        .eq("assigned_to", employeeId)
        .eq("status", "open")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryIssueWithPeople[];
    },
  });
}

export async function createDeliveryIssue(input: {
  productVendor: string;
  issueDescription: string;
  photoUrl: string | null;
  photoUrl2?: string | null;
  truckDate?: string | null;
  reportedBy: string | null;
  assignedTo: string | null;
}) {
  const { error } = await supabase.from("delivery_issues").insert({
    product_vendor: input.productVendor,
    issue_description: input.issueDescription,
    photo_url: input.photoUrl,
    photo_url_2: input.photoUrl2 ?? null,
    truck_date: input.truckDate ?? null,
    reported_by: input.reportedBy,
    assigned_to: input.assignedTo,
    status: "open",
  });
  if (error) throw error;
}

/** Every open delivery issue company-wide (admin/ops view). */
export function allOpenDeliveryIssuesQueryOptions() {
  return queryOptions({
    queryKey: ["delivery-issues", "open", "all"],
    queryFn: async (): Promise<DeliveryIssueWithPeople[]> => {
      const { data, error } = await supabase
        .from("delivery_issues")
        .select(withPeople)
        .eq("status", "open")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryIssueWithPeople[];
    },
  });
}

export async function resolveDeliveryIssue(id: string) {
  const { error } = await supabase
    .from("delivery_issues")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}