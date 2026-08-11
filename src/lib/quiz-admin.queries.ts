import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type QuizRow = Database["public"]["Tables"]["quiz_bank"]["Row"];

/** Every question for a step, including soft-deleted ones so GM/Owner can restore. */
export function stepQuizzesQueryOptions(stepId: string | undefined) {
  return queryOptions({
    queryKey: ["step-quizzes", stepId],
    enabled: Boolean(stepId),
    queryFn: async (): Promise<QuizRow[]> => {
      const { data, error } = await supabase
        .from("quiz_bank")
        .select("*")
        .eq("step_id", stepId!)
        .order("sequence_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type QuizQuestionInput = {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string | null;
  sequenceOrder: number;
};

export async function createQuizQuestion(input: QuizQuestionInput & { stepId: string }) {
  const { error } = await supabase.from("quiz_bank").insert({
    step_id: input.stepId,
    question: input.question,
    options: input.options,
    correct_option: input.correctOption,
    explanation: input.explanation,
    sequence_order: input.sequenceOrder,
  });
  if (error) throw error;
}

export async function updateQuizQuestion(id: string, input: QuizQuestionInput) {
  const { error } = await supabase
    .from("quiz_bank")
    .update({
      question: input.question,
      options: input.options,
      correct_option: input.correctOption,
      explanation: input.explanation,
      sequence_order: input.sequenceOrder,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setQuizQuestionDeleted(input: {
  id: string;
  deleted: boolean;
  actorId: string | null;
}) {
  const { error } = await supabase
    .from("quiz_bank")
    .update(
      input.deleted
        ? { is_deleted: true, deleted_by: input.actorId, deleted_at: new Date().toISOString() }
        : { is_deleted: false, deleted_by: null, deleted_at: null },
    )
    .eq("id", input.id);
  if (error) throw error;
}
