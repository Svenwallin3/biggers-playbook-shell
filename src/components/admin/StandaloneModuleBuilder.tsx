import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ModuleEditPanel } from "@/components/admin/EntityEditPanels";
import { StandaloneStepEditor } from "@/components/admin/StandaloneStepEditor";

import { NewStepDialog } from "@/components/admin/ContentCreateDialogs";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import type { ModuleRow, StepRow, TrackRow } from "@/lib/training.queries";

/**
 * Every step in this module, soft-deleted ones included — this builder deliberately
 * surfaces hidden steps so they can be restored in place.
 */
export function allStepsQueryOptions(moduleId: string) {
  return queryOptions({
    queryKey: ["module", moduleId, "all-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("steps")
        .select("*")
        .eq("module_id", moduleId)
        .order("sequence_order");
      if (error) throw error;
      return (data ?? []) as StepRow[];
    },
  });
}

export function StandaloneModuleBuilder({
  module: mod,
  canEditDirect,
  canSuggest,
  canCreate,
  employeeId,
  deleteRequiresApproval,
  onPreviewAsTrainee,
}: {
  module: ModuleRow & { track?: TrackRow | null };
  canEditDirect: boolean;
  canSuggest: boolean;
  canCreate: boolean;
  employeeId?: string | undefined;
  deleteRequiresApproval: boolean;
  onPreviewAsTrainee: () => void;
}) {
  const queryClient = useQueryClient();
  const stepsQuery = useQuery(allStepsQueryOptions(mod.id));
  const steps = stepsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{mod.name}</h1>
          <p className="text-xs text-muted-foreground">
            Standalone module — everything on one page, no step-by-step walk.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onPreviewAsTrainee}>
          <Eye className="size-4" aria-hidden="true" />
          Preview as trainee
        </Button>
      </div>

      <ModuleEditPanel
        module={mod}
        trackName={mod.track?.name}
        canEdit={canEditDirect}
        employeeId={employeeId}
        deleteRequiresApproval={deleteRequiresApproval}
      />

      {stepsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading steps…</p>
      ) : steps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No steps yet. Add the first one below to start building this module.
          </CardContent>
        </Card>
      ) : (
        steps.map((s, i) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="text-muted-foreground">Step {i + 1}</span>
                <span className={s.is_deleted ? "line-through" : undefined}>{s.title}</span>
                {s.is_deleted ? <Badge variant="outline">Hidden</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <StepEditPanel
                step={s}
                stepModule={mod}
                canEditDirect={canEditDirect}
                canSuggest={canSuggest}
                employeeId={employeeId}
              />
              {s.step_type === "quiz" ? <QuizQuestionsPanel stepId={s.id} /> : null}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex justify-center">
        <NewStepDialog
          moduleId={mod.id}
          nextSequence={steps.length + 1}
          disabled={!canCreate}
          canEditDirect={canEditDirect}
          trigger={<Button size="sm">+ Add step</Button>}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ["module", mod.id] });
          }}
        />
      </div>
    </div>
  );
}
