import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type StepRow = Database["public"]["Tables"]["steps"]["Row"];
export type QuizRow = Database["public"]["Tables"]["quiz_bank"]["Row"];
export type ProgressRow = Database["public"]["Tables"]["progress_records"]["Row"];
export type SourcingRow = Database["public"]["Tables"]["sourcing_board_entries"]["Row"];
export type ReferenceDocRow = Database["public"]["Tables"]["reference_documents"]["Row"];
export type PresentationRow = Database["public"]["Tables"]["presentation_reference_entries"]["Row"];
export type StepType = Database["public"]["Enums"]["step_type"];
export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type Department = Database["public"]["Enums"]["department"];

export const stepTypeLabels: Record<StepType, string> = {
  text: "Written steps",
  photo: "Photo",
  video: "Video",
  quiz: "Quiz",
  doing_signoff: "Trainer sign-off",
  supervised_live_practice: "Supervised live practice",
};

/** Steps a trainee cannot self-complete — a trainer signs these off. */
export const trainerSignoffTypes: StepType[] = ["doing_signoff", "supervised_live_practice"];

export type DayPosition = "start" | "middle" | "end";

/** Where a step sits inside its onboarding day. Anything unflagged is `middle`. */
export function dayPositionOf(step: { day_position?: string | null }): DayPosition {
  return step.day_position === "start" || step.day_position === "end"
    ? step.day_position
    : "middle";
}

export function bodyLines(step: Pick<StepRow, "content_body">) {
  return (step.content_body ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function departmentsForPath(path: string | null): Department[] {
  const p = (path ?? "").toLowerCase();
  if (p.startsWith("kitchen")) return ["universal", "kitchen"];
  if (p.startsWith("deliver")) return ["universal", "delivery"];
  if (p.startsWith("market")) return ["universal", "market"];
  return ["universal"];
}

export type PlanModule = ModuleRow & { track: TrackRow; steps: StepRow[] };

/**
 * The order Next / the training queue walk steps in.
 *
 * Modules must already be in plan order (day, then track/module sequence).
 * Within each `day_assignment` group, steps fall into three buckets driven by
 * `day_position`: `'start'` steps open the day, `'middle'` steps (the default —
 * everything not explicitly flagged) keep their existing relative order in the
 * middle, and `'end'` steps close the day. Relative order within each bucket is
 * preserved, and days never interleave.
 */
export function getDayGroupedSteps<
  M extends { id: string; day_assignment: number | null; steps: StepRow[] },
>(modules: M[]): Array<{ module: M; step: StepRow }> {
  const groups: Array<{
    day: number;
    start: Array<{ module: M; step: StepRow }>;
    middle: Array<{ module: M; step: StepRow }>;
    end: Array<{ module: M; step: StepRow }>;
  }> = [];

  for (const module of modules) {
    const day = module.day_assignment ?? 99;
    let group = groups.find((g) => g.day === day);
    if (!group) {
      group = { day, start: [], middle: [], end: [] };
      groups.push(group);
    }
    for (const step of module.steps) {
      const entry = { module, step };
      const position = dayPositionOf(step);
      if (position === "start") group.start.push(entry);
      else if (position === "end") group.end.push(entry);
      else group.middle.push(entry);
    }
  }

  return groups.flatMap((g) => [...g.start, ...g.middle, ...g.end]);
}

/** Today's plan: the Universal track plus the employee's own path, in onboarding-day order. */
export function planQueryOptions(path: string | null, allDepartments = false) {
  const departments: Department[] = allDepartments
    ? ["universal", "market", "kitchen", "delivery"]
    : departmentsForPath(path);
  return queryOptions({
    queryKey: ["training-plan", departments],
    queryFn: async (): Promise<PlanModule[]> => {
      const { data: tracks, error: trackError } = await supabase
        .from("tracks")
        .select("*")
        .in("department", departments)
        .eq("is_deleted", false)
        .order("sequence_order");
      if (trackError) throw trackError;

      const trackIds = (tracks ?? []).map((t) => t.id);
      if (!trackIds.length) return [];

      const { data: modules, error: moduleError } = await supabase
        .from("modules")
        .select("*")
        .in("track_id", trackIds)
        .eq("is_deleted", false);
      if (moduleError) throw moduleError;

      const moduleIds = (modules ?? []).map((m) => m.id);
      if (!moduleIds.length) return [];

      const { data: steps, error: stepError } = await supabase
        .from("steps")
        .select("*")
        .in("module_id", moduleIds)
        .eq("is_deleted", false)
        .order("sequence_order");
      if (stepError) throw stepError;

      const trackById = new Map((tracks ?? []).map((t) => [t.id, t]));

      return (modules ?? [])
        .map((m) => ({
          ...m,
          track: trackById.get(m.track_id)!,
          steps: (steps ?? []).filter((s) => s.module_id === m.id),
        }))
        .sort((a, b) => {
          // Universal / Hospitality always comes first, then by onboarding day.
          const dept = a.track.sequence_order - b.track.sequence_order;
          if (a.track.department === "universal" && b.track.department !== "universal") return -1;
          if (b.track.department === "universal" && a.track.department !== "universal") return 1;
          const day = (a.day_assignment ?? 99) - (b.day_assignment ?? 99);
          if (day !== 0) return day;
          if (dept !== 0) return dept;
          return a.sequence_order - b.sequence_order;
        });
    },
  });
}

export function progressQueryOptions(employeeId: string | undefined) {
  return queryOptions({
    queryKey: ["progress", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<ProgressRow[]> => {
      const { data, error } = await supabase
        .from("progress_records")
        .select("*")
        .eq("employee_id", employeeId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function moduleQueryOptions(moduleId: string) {
  return queryOptions({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const { data: mod, error } = await supabase
        .from("modules")
        .select("*, track:tracks(*)")
        .eq("id", moduleId)
        .maybeSingle();
      if (error) throw error;
      if (!mod) return null;

      const { data: steps, error: stepError } = await supabase
        .from("steps")
        .select("*")
        .eq("module_id", moduleId)
        .eq("is_deleted", false)
        .order("sequence_order");
      if (stepError) throw stepError;

      const stepIds = (steps ?? []).map((s) => s.id);
      let quizzes: QuizRow[] = [];
      if (stepIds.length) {
        const { data: quizRows, error: quizError } = await supabase
          .from("quiz_bank")
          .select("*")
          .in("step_id", stepIds)
          .eq("is_deleted", false)
          .order("sequence_order");
        if (quizError) throw quizError;
        quizzes = quizRows ?? [];
      }

      return { module: mod as ModuleRow & { track: TrackRow }, steps: steps ?? [], quizzes };
    },
  });
}

export function sourcingQueryOptions() {
  return queryOptions({
    queryKey: ["sourcing-board"],
    queryFn: async (): Promise<SourcingRow[]> => {
      const { data, error } = await supabase
        .from("sourcing_board_entries")
        .select("*")
        .eq("is_deleted", false)
        .order("product");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type SearchResults = {
  modules: (ModuleRow & { track: TrackRow })[];
  steps: (StepRow & { module: ModuleRow | null })[];
  sourcing: SourcingRow[];
  referenceDocs: ReferenceDocRow[];
  presentation: PresentationRow[];
};

export function searchQueryOptions(term: string) {
  const trimmed = term.trim();
  return queryOptions({
    queryKey: ["search", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async (): Promise<SearchResults> => {
      const like = `%${trimmed.replace(/[%_]/g, "")}%`;

      const [moduleRes, stepRes, sourcingRes, referenceRes, presentationRes] = await Promise.all([
        supabase
          .from("modules")
          .select("*, track:tracks(*)")
          .eq("is_deleted", false)
          .or(`name.ilike.${like},description.ilike.${like},sub_path.ilike.${like}`)
          .limit(10),
        supabase
          .from("steps")
          .select("*, module:modules(*)")
          .eq("is_deleted", false)
          .or(`title.ilike.${like},content_body.ilike.${like}`)
          .limit(20),
        supabase
          .from("sourcing_board_entries")
          .select("*")
          .eq("is_deleted", false)
          .or(
            `product.ilike.${like},supplier.ilike.${like},region.ilike.${like},notes.ilike.${like}`,
          )
          .limit(15),
        supabase
          .from("reference_documents")
          .select("*")
          .eq("is_deleted", false)
          .or(`title.ilike.${like},sub_category.ilike.${like}`)
          .limit(15),
        supabase
          .from("presentation_reference_entries")
          .select("*")
          .eq("is_deleted", false)
          .or(`item_name.ilike.${like},category.ilike.${like},portion_note.ilike.${like}`)
          .limit(15),
      ]);

      if (moduleRes.error) throw moduleRes.error;
      if (stepRes.error) throw stepRes.error;
      if (sourcingRes.error) throw sourcingRes.error;
      if (referenceRes.error) throw referenceRes.error;
      if (presentationRes.error) throw presentationRes.error;

      return {
        modules: (moduleRes.data ?? []) as SearchResults["modules"],
        steps: (stepRes.data ?? []) as SearchResults["steps"],
        sourcing: sourcingRes.data ?? [],
        referenceDocs: referenceRes.data ?? [],
        presentation: presentationRes.data ?? [],
      };
    },
  });
}

export async function setStepProgress(input: {
  employeeId: string;
  stepId: string;
  completed: boolean;
  existingId?: string | undefined;
}) {
  const payload = {
    employee_id: input.employeeId,
    step_id: input.stepId,
    status: (input.completed
      ? "completed"
      : "in_progress") as Database["public"]["Enums"]["progress_status"],
    started_at: new Date().toISOString(),
    completed_at: input.completed ? new Date().toISOString() : null,
  };

  if (input.existingId) {
    const { error } = await supabase
      .from("progress_records")
      .update(payload)
      .eq("id", input.existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("progress_records").insert(payload);
  if (error) throw error;
}

/** Trainer sign-off: marks a step certified by the acting manager/owner. */
/**
 * Manager initials on an ungated step: records who/when without changing the
 * step's progress status, so it never gates Next or ordering.
 */
export async function logManagerInitials(input: {
  employeeId: string;
  stepId: string;
  signedOffBy: string;
  existingId?: string | undefined;
}) {
  const now = new Date().toISOString();
  if (input.existingId) {
    const { error } = await supabase
      .from("progress_records")
      .update({ signed_off_by: input.signedOffBy, signed_off_at: now })
      .eq("id", input.existingId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("progress_records").insert({
    employee_id: input.employeeId,
    step_id: input.stepId,
    status: "in_progress" as Database["public"]["Enums"]["progress_status"],
    started_at: now,
    signed_off_by: input.signedOffBy,
    signed_off_at: now,
  });
  if (error) throw error;
}

export async function signOffStep(input: {
  employeeId: string;
  stepId: string;
  signedOffBy: string;
  existingId?: string | undefined;
}) {
  const now = new Date().toISOString();
  const payload = {
    employee_id: input.employeeId,
    step_id: input.stepId,
    status: "signed_off" as Database["public"]["Enums"]["progress_status"],
    completed_at: now,
    signed_off_by: input.signedOffBy,
    signed_off_at: now,
  };

  if (input.existingId) {
    const { error } = await supabase
      .from("progress_records")
      .update(payload)
      .eq("id", input.existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("progress_records").insert({ ...payload, started_at: now });
  if (error) throw error;
}
