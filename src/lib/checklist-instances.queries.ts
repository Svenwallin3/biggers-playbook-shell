import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChecklistInstanceRow = Database["public"]["Tables"]["checklist_instances"]["Row"];
export type ChecklistLineCompletionRow =
  Database["public"]["Tables"]["checklist_line_completions"]["Row"];

export type ChecklistInstance = ChecklistInstanceRow & {
  submitter: { id: string; full_name: string | null; email: string } | null;
};

/** Local (not UTC) calendar day — a shift's checklist belongs to the day the floor is on. */
export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const SELECT =
  "*, submitter:employees!checklist_instances_submitted_by_fkey(id, full_name, email)";

async function selectInstance(documentId: string, locationTag: string | null, date: string) {
  let q = supabase
    .from("checklist_instances")
    .select(SELECT)
    .eq("reference_document_id", documentId)
    .eq("instance_date", date);
  q = locationTag === null ? q.is("location_tag", null) : q.eq("location_tag", locationTag);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as ChecklistInstance | null;
}

/**
 * One shared instance per document per day (per location), never a per-employee copy.
 * Insert-then-ignore-conflict, then read back so a second opener sees existing ticks.
 */
export async function getOrCreateTodaysInstance(
  documentId: string,
  locationTag: string | null,
): Promise<ChecklistInstance> {
  const date = todayISO();
  const existing = await selectInstance(documentId, locationTag, date);
  if (existing) return existing;

  const { error } = await supabase.from("checklist_instances").insert({
    reference_document_id: documentId,
    instance_date: date,
    location_tag: locationTag,
    status: "in_progress",
  });
  // A concurrent opener may have won the race; the unique constraint is the arbiter.
  if (error && error.code !== "23505") throw error;

  const created = await selectInstance(documentId, locationTag, date);
  if (!created) throw new Error("Couldn't open today's checklist.");
  return created;
}

export function todaysChecklistInstanceQueryOptions(
  documentId: string | undefined,
  locationTag: string | null,
  enabled = true,
) {
  return queryOptions({
    queryKey: ["checklist-instance", documentId, locationTag, todayISO()],
    enabled: Boolean(documentId) && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always" as const,
    queryFn: () => getOrCreateTodaysInstance(documentId!, locationTag),
  });
}

export function checklistCompletionsQueryOptions(instanceId: string | undefined) {
  return queryOptions({
    queryKey: ["checklist-completions", instanceId],
    enabled: Boolean(instanceId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always" as const,
    queryFn: async (): Promise<ChecklistLineCompletionRow[]> => {
      const { data, error } = await supabase
        .from("checklist_line_completions")
        .select("*")
        .eq("instance_id", instanceId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function completionKey(sectionIndex: number, lineOrder: number) {
  return `${sectionIndex}:${lineOrder}`;
}

/** Toggles one line. Unchecking keeps the row (audit trail) and just clears who/when. */
export async function toggleChecklistLine(input: {
  instanceId: string;
  sectionIndex: number;
  lineOrder: number;
  completed: boolean;
  employeeId: string | null;
}) {
  const { error } = await supabase.from("checklist_line_completions").upsert(
    {
      instance_id: input.instanceId,
      section_index: input.sectionIndex,
      line_order: input.lineOrder,
      completed: input.completed,
      completed_by: input.completed ? input.employeeId : null,
      completed_at: input.completed ? new Date().toISOString() : null,
    },
    { onConflict: "instance_id,section_index,line_order" },
  );
  if (error) throw error;
}

export async function submitChecklistInstance(input: {
  instanceId: string;
  employeeId: string | null;
}) {
  const { error } = await supabase
    .from("checklist_instances")
    .update({
      status: "submitted",
      submitted_by: input.employeeId,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", input.instanceId);
  if (error) throw error;
}

/** List-view badge data: which of these checklists are already submitted today. */
export function submittedTodayQueryOptions(documentIds: string[]) {
  const key = [...documentIds].sort();
  return queryOptions({
    queryKey: ["checklist-submitted-today", todayISO(), key],
    enabled: key.length > 0,
    staleTime: 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("checklist_instances")
        .select("reference_document_id, status")
        .eq("instance_date", todayISO())
        .eq("status", "submitted")
        .in("reference_document_id", key);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.reference_document_id));
    },
  });
}