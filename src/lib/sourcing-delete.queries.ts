import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SourcingDeleteRequest =
  Database["public"]["Tables"]["sourcing_board_delete_requests"]["Row"];

export const SOURCING_DELETE_REQUESTS_KEY = ["sourcing-delete-requests", "pending"] as const;

export function pendingSourcingDeleteRequestsQueryOptions() {
  return queryOptions({
    queryKey: SOURCING_DELETE_REQUESTS_KEY,
    queryFn: async (): Promise<SourcingDeleteRequest[]> => {
      const { data, error } = await supabase
        .from("sourcing_board_delete_requests")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function requestSourcingDelete(input: {
  entryId: string;
  productName: string;
  requestedBy: string;
  reason?: string | null;
}) {
  const { error } = await supabase.from("sourcing_board_delete_requests").insert({
    entry_id: input.entryId,
    product_snapshot: input.productName,
    requested_by: input.requestedBy,
    reason: input.reason?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteSourcingEntryDirect(input: { entryId: string; deletedBy: string }) {
  const { error } = await supabase
    .from("sourcing_board_entries")
    .update({
      is_deleted: true,
      deleted_by: input.deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", input.entryId);
  if (error) throw error;
}

export async function decideSourcingDeleteRequest(input: {
  requestId: string;
  entryId: string;
  decision: "approved" | "rejected";
  reviewedBy: string;
}) {
  if (input.decision === "approved") {
    const { error: entryError } = await supabase
      .from("sourcing_board_entries")
      .update({
        is_deleted: true,
        deleted_by: input.reviewedBy,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", input.entryId);
    if (entryError) throw entryError;
  }
  const { error } = await supabase
    .from("sourcing_board_delete_requests")
    .update({
      status: input.decision,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);
  if (error) throw error;
}
