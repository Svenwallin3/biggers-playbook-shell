import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type StepRow = Database["public"]["Tables"]["steps"]["Row"];
export type QuizRow = Database["public"]["Tables"]["quiz_bank"]["Row"];
/** Trainee-safe quiz shape — the answer key never leaves the server. */
export type QuizQuestion = Database["public"]["Functions"]["get_quiz_questions"]["Returns"][number];

/** Fetch quiz questions without correct_option/explanation, via a SECURITY DEFINER RPC. */
export async function fetchQuizQuestions(stepIds: string[]): Promise<QuizQuestion[]> {
  if (!stepIds.length) return [];
  const { data, error } = await supabase.rpc("get_quiz_questions", { _step_ids: stepIds });
  if (error) throw error;
  return data ?? [];
}

export type QuizGrade = {
  is_correct: boolean;
  correct_option: number;
  explanation: string | null;
};

/** Grade one answer server-side; the attempt is recorded before the result is returned. */
export async function submitQuizAnswer(quizId: string, chosenOption: number): Promise<QuizGrade> {
  const { data, error } = await supabase.rpc("submit_quiz_answer", {
    _quiz_id: quizId,
    _chosen_option: chosenOption,
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) throw new Error("No grade returned");
  return row as QuizGrade;
}
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

/** An extra division an employee is cross-trained into, with its own branch. */
export type SecondaryDivision = { department: Department; sub_path: string | null };

/**
 * The departments an employee's plan should include: Universal, their own
 * division, plus any active cross-training divisions. Driven by real enum
 * values, not string matching on `path` — works for any division without code
 * changes. `department_scope` itself stays single-valued; cross-training lives
 * in `employee_secondary_divisions`.
 */
export function departmentsForEmployee(
  department: Department | null | undefined,
  secondary: SecondaryDivision[] = [],
): Department[] {
  const out: Department[] = ["universal"];
  for (const d of [department, ...secondary.map((s) => s.department)]) {
    if (d && d !== "universal" && !out.includes(d)) out.push(d);
  }
  return out;
}

/**
 * Which branch (`sub_path`) applies in a given division for this employee:
 * their own `sub_path` in their home division, or the branch recorded on the
 * cross-training row for a secondary division.
 */
export function subPathForDepartment(
  trackDepartment: Department,
  homeDepartment: Department | null | undefined,
  homeSubPath: string | null | undefined,
  secondary: SecondaryDivision[] = [],
): string | null {
  const match = secondary.find((s) => s.department === trackDepartment);
  if (match && trackDepartment !== homeDepartment) return match.sub_path;
  return homeSubPath ?? null;
}

/**
 * Whether a module is visible to an employee given their chosen branch.
 * `module.sub_path === null` means shared across every branch in its
 * division. A module with `sub_path` set is visible only to an employee
 * whose own `sub_path` matches exactly. Division-agnostic on purpose — no
 * hardcoded branch names — so any future division can add its own branch
 * split just by tagging modules, same pattern as `departmentsForEmployee`.
 */
export function moduleVisibleForSubPath(
  module: { sub_path: string | null },
  employeeSubPath: string | null | undefined,
): boolean {
  return !module.sub_path || module.sub_path === employeeSubPath;
}

/** Branch-aware visibility across home + cross-trained divisions. */
export function moduleVisibleForScope(
  module: { sub_path: string | null; track?: { department: Department } | null },
  trackDepartment: Department,
  homeDepartment: Department | null | undefined,
  homeSubPath: string | null | undefined,
  secondary: SecondaryDivision[] = [],
): boolean {
  return moduleVisibleForSubPath(
    module,
    subPathForDepartment(trackDepartment, homeDepartment, homeSubPath, secondary),
  );
}


/** Distinct branch values live on a division's modules, e.g. ["Production","Service"] for Kitchen. Empty array = this division has no branch split. */
export function branchOptionsQueryOptions(department: Department | null) {
  return queryOptions({
    queryKey: ["branch-options", department ?? "none"],
    enabled: !!department,
    queryFn: async (): Promise<string[]> => {
      const { data: tracks, error: trackError } = await supabase
        .from("tracks")
        .select("id")
        .eq("department", department!)
        .eq("is_deleted", false);
      if (trackError) throw trackError;

      const trackIds = (tracks ?? []).map((t) => t.id);
      if (!trackIds.length) return [];

      const { data: modules, error } = await supabase
        .from("modules")
        .select("sub_path")
        .in("track_id", trackIds)
        .eq("is_deleted", false)
        .not("sub_path", "is", null);
      if (error) throw error;

      return [...new Set((modules ?? []).map((m) => m.sub_path).filter(Boolean) as string[])].sort();
    },
  });
}

/**
 * Onboarding day decides first; Universal wins same-day ties (Clock-in /
 * Welcome / Hospitality-Standards-intro before that day's department-specific
 * modules, both before that day's `end`-bucket in-person sign-off — driven by
 * `day_position`). Shared by the trainee plan, the manager training queue, and
 * the sign-off backlog so all three stay in sync for every division.
 */
export function compareModulesByDay(
  a: {
    day_assignment: number | null;
    sequence_order: number;
    track: { department: Department; sequence_order: number } | null | undefined;
  },
  b: {
    day_assignment: number | null;
    sequence_order: number;
    track: { department: Department; sequence_order: number } | null | undefined;
  },
): number {
  const day = (a.day_assignment ?? 99) - (b.day_assignment ?? 99);
  if (day !== 0) return day;
  const aUniversal = a.track?.department === "universal";
  const bUniversal = b.track?.department === "universal";
  if (aUniversal && !bUniversal) return -1;
  if (bUniversal && !aUniversal) return 1;
  const dept = (a.track?.sequence_order ?? 0) - (b.track?.sequence_order ?? 0);
  if (dept !== 0) return dept;
  return a.sequence_order - b.sequence_order;
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

  groups.sort((a, b) => a.day - b.day);
  return groups.flatMap((g) => [...g.start, ...g.middle, ...g.end]);
}

/** Today's plan: the Universal track plus the employee's own division, in onboarding-day order. */
export function planQueryOptions(
  department: Department | null,
  subPath: string | null = null,
  allDepartments = false,
) {
  return queryOptions({
    queryKey: [
      "training-plan",
      allDepartments ? "all" : (department ?? "none"),
      allDepartments ? "all" : (subPath ?? "none"),
    ],
    queryFn: async (): Promise<PlanModule[]> => {
      let trackQuery = supabase
        .from("tracks")
        .select("*")
        .eq("is_deleted", false)
        .order("sequence_order");
      if (!allDepartments) {
        trackQuery = trackQuery.in("department", departmentsForEmployee(department));
      }
      const { data: tracks, error: trackError } = await trackQuery;
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
        .filter((m) => allDepartments || moduleVisibleForSubPath(m, subPath))
        .map((m) => ({
          ...m,
          track: trackById.get(m.track_id)!,
          steps: (steps ?? []).filter((s) => s.module_id === m.id),
        }))
        .sort(compareModulesByDay);
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
      const quizzes = await fetchQuizQuestions(stepIds);

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

export type SignoffChecklistDepartment = "kitchen" | "market" | "delivery" | "universal";

export interface SignoffChecklistItem {
  text: string;
  department?: SignoffChecklistDepartment | null | undefined;
}

/** Authored sign-off checklist on a step, tolerant of hand-written jsonb. */
export function parseSignoffChecklist(value: unknown): SignoffChecklistItem[] {
  if (!Array.isArray(value)) return [];
  const items: SignoffChecklistItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const text = typeof rec["text"] === "string" ? rec["text"].trim() : "";
    if (!text) continue;
    const dept = typeof rec["department"] === "string" ? rec["department"] : null;
    items.push({
      text,
      department:
        dept === "kitchen" || dept === "market" || dept === "delivery" || dept === "universal"
          ? dept
          : null,
    });
  }
  return items;
}

/** Items that apply to a given trainee: unscoped/universal items plus their own division. */
export function checklistForDepartment(
  value: unknown,
  department: string | null | undefined,
): SignoffChecklistItem[] {
  return parseSignoffChecklist(value).filter(
    (item) =>
      !item.department || item.department === "universal" || item.department === department,
  );
}

export async function signOffStep(input: {
  employeeId: string;
  stepId: string;
  signedOffBy: string;
  existingId?: string | undefined;
  /** Optional trainer handoff note, manager-visible only. */
  notes?: string | undefined;
  /** Item texts the trainer confirmed at sign-off, when the step has a checklist. */
  checklistConfirmed?: string[] | undefined;
}) {
  const now = new Date().toISOString();
  const note = input.notes?.trim();
  const confirmed = (input.checklistConfirmed ?? []).filter((t) => t.trim().length > 0);
  const payload = {
    employee_id: input.employeeId,
    step_id: input.stepId,
    status: "signed_off" as Database["public"]["Enums"]["progress_status"],
    completed_at: now,
    signed_off_by: input.signedOffBy,
    signed_off_at: now,
    ...(note ? { notes: note } : {}),
    ...(confirmed.length ? { checklist_confirmed: confirmed } : {}),
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
