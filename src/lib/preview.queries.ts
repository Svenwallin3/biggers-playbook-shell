import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { ModuleRow, QuizRow, StepRow, TrackRow } from "@/lib/training.queries";

export type PreviewModule = ModuleRow & { steps: StepRow[] };

/** All live tracks, for the preview-as-trainee track picker. */
export function previewTracksQueryOptions() {
  return queryOptions({
    queryKey: ["preview-tracks"],
    queryFn: async (): Promise<TrackRow[]> => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("is_deleted", false)
        .order("sequence_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** One track's modules + steps + quizzes, ordered exactly as a trainee would meet them. */
export function previewTrackQueryOptions(trackId: string | undefined) {
  return queryOptions({
    queryKey: ["preview-track", trackId],
    enabled: Boolean(trackId),
    queryFn: async (): Promise<{ modules: PreviewModule[]; quizzes: QuizRow[] }> => {
      const { data: modules, error } = await supabase
        .from("modules")
        .select("*")
        .eq("track_id", trackId!)
        .eq("is_deleted", false);
      if (error) throw error;

      const moduleIds = (modules ?? []).map((m) => m.id);
      if (!moduleIds.length) return { modules: [], quizzes: [] };

      const { data: steps, error: stepError } = await supabase
        .from("steps")
        .select("*")
        .in("module_id", moduleIds)
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

      const ordered = (modules ?? [])
        .map((m) => ({ ...m, steps: (steps ?? []).filter((s) => s.module_id === m.id) }))
        .sort((a, b) => {
          const day = (a.day_assignment ?? 99) - (b.day_assignment ?? 99);
          if (day !== 0) return day;
          return a.sequence_order - b.sequence_order;
        });

      return { modules: ordered, quizzes };
    },
  });
}
