import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HuddleCardRow = Database["public"]["Tables"]["huddle_cards"]["Row"];
export type ManagerNoteRow = Database["public"]["Tables"]["manager_notes"]["Row"];

export type HuddleDepartment = "market" | "kitchen";

/** Manager's huddle department, derived the same way departmentsForPath does. */
export function huddleDepartmentForPath(path: string | null | undefined): HuddleDepartment {
  return (path ?? "").toLowerCase().startsWith("kitchen") ? "kitchen" : "market";
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Kitchen only runs service Friday–Sunday, so its huddle only surfaces then.
 * Market runs seven days a week.
 */
export function huddleRunsToday(
  department: HuddleDepartment,
  date = new Date(),
): boolean {
  if (department !== "kitchen") return true;
  const day = date.getDay(); // 0 = Sunday
  return day === 0 || day === 5 || day === 6;
}

/** Deterministically picks one huddle card per calendar day, no stored pointer. */
export function todaysHuddleCardQueryOptions(department: HuddleDepartment) {
  return queryOptions({
    queryKey: ["huddle-card", department, todayISO()],
    queryFn: async (): Promise<HuddleCardRow | null> => {
      if (!huddleRunsToday(department)) return null;
      const { data, error } = await supabase
        .from("huddle_cards")
        .select("*")
        .eq("is_deleted", false)
        .contains("departments", [department])
        .order("sequence_order");
      if (error) throw error;
      const cards = data ?? [];
      if (!cards.length) return null;
      return cards[dayOfYear() % cards.length] ?? null;
    },
  });
}

/** Manager notes effective today, filtered by department and location scope. */
export function todaysManagerNotesQueryOptions(
  department: HuddleDepartment,
  locationId: string | null | undefined,
) {
  const today = todayISO();
  return queryOptions({
    queryKey: ["manager-notes", today, department, locationId ?? "any"],
    queryFn: async (): Promise<ManagerNoteRow[]> => {
      const { data, error } = await supabase
        .from("manager_notes")
        .select("*")
        .eq("is_deleted", false)
        .eq("effective_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((note) => {
        const depts = note.departments ?? [];
        const deptOk = depts.length === 0 || depts.includes(department);
        const locOk = !note.location_tag || note.location_tag === locationId;
        return deptOk && locOk;
      });
    },
  });
}

export async function createManagerNote(input: {
  noteText: string;
  departments: string[];
  locationTag: string | null;
  createdBy: string | null;
}) {
  const { error } = await supabase.from("manager_notes").insert({
    note_text: input.noteText,
    departments: input.departments,
    location_tag: input.locationTag,
    created_by: input.createdBy,
    effective_date: todayISO(),
  });
  if (error) throw error;
}

export async function deleteManagerNote(input: { id: string; deletedBy: string | null }) {
  const { error } = await supabase
    .from("manager_notes")
    .update({
      is_deleted: true,
      deleted_by: input.deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}
