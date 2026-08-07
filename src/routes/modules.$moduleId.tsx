import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  getDayGroupedSteps,
  moduleQueryOptions,
  planQueryOptions,
  progressQueryOptions,
  setStepProgress,
  signOffStep,
  trainerSignoffTypes,
} from "@/lib/training.queries";

export const Route = createFileRoute("/modules/$moduleId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { step?: string | undefined; trainee?: string | undefined } => ({
    step: typeof search["step"] === "string" ? search["step"] : undefined,
    // Set when a manager opens the module from the training queue for a specific trainee.
    trainee: typeof search["trainee"] === "string" ? search["trainee"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Module — Biggers Training Platform" },
      { name: "description", content: "Step-by-step training module for Biggers Market staff." },
      { property: "og:title", content: "Module — Biggers Training Platform" },
      {
        property: "og:description",
        content: "Step-by-step training module for Biggers Market staff.",
      },
    ],
  }),
  component: ModulePage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  ),
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Module not found.</p>,
});

function ModulePage() {
  const { moduleId } = Route.useParams();
  const { step: stepParam, trainee } = Route.useSearch();
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";
  // A manager can be standing with the trainee; otherwise these are the viewer's own records.
  const subjectId = (isAdmin && trainee) || employee?.id;

  const moduleQuery = useQuery(moduleQueryOptions(moduleId));
  const progressQuery = useQuery(progressQueryOptions(subjectId));

  // When a manager is walking a specific trainee through training, the ordered plan
  // has to follow that trainee's path, not the manager's.
  const traineeQuery = useQuery({
    queryKey: ["employee-path", subjectId],
    enabled: Boolean(isAdmin && trainee && subjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("path")
        .eq("id", subjectId!)
        .maybeSingle();
      if (error) throw error;
      return data?.path ?? null;
    },
  });
  const subjectPath =
    isAdmin && trainee ? (traineeQuery.data ?? null) : (employee?.path ?? null);
  const planQuery = useQuery({
    ...planQueryOptions(subjectPath),
    enabled: Boolean(subjectId) && !(isAdmin && trainee && traineeQuery.isPending),
  });
  // One flat, ordered walk through every step in the plan: each day's self-paced
  // steps first, then that day's trainer-required steps.
  const orderedSteps = getDayGroupedSteps(planQuery.data ?? []).map((entry) => ({
    moduleId: entry.module.id,
    stepId: entry.step.id,
  }));

  const progressByStep = new Map(
    (progressQuery.data ?? []).map((record) => [record.step_id, record]),
  );

  const toggle = useMutation({
    mutationFn: (input: { stepId: string; completed: boolean }) =>
      setStepProgress({
        employeeId: subjectId!,
        stepId: input.stepId,
        completed: input.completed,
        existingId: progressByStep.get(input.stepId)?.id,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress", subjectId] }),
    onError: (error: Error) => toast.error("Couldn't save that", { description: error.message }),
  });

  const signOff = useMutation({
    mutationFn: (stepId: string) =>
      signOffStep({
        employeeId: subjectId!,
        stepId,
        signedOffBy: employee!.id,
        existingId: progressByStep.get(stepId)?.id,
      }),
    onSuccess: () => {
      toast.success("Signed off");
      void queryClient.invalidateQueries({ queryKey: ["progress", subjectId] });
      void queryClient.invalidateQueries({ queryKey: ["training-queue"] });
    },
    onError: (error: Error) => toast.error("Couldn't sign off", { description: error.message }),
  });

  if (moduleQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading module…</p>;
  }
  if (moduleQuery.isError) {
    return <p className="text-sm text-destructive">Couldn&apos;t load this module.</p>;
  }
  if (!moduleQuery.data) {
    return <p className="text-sm text-muted-foreground">Module not found.</p>;
  }

  const { module: mod, steps, quizzes } = moduleQuery.data;
  const active = steps.find((s) => s.id === stepParam) ?? steps[0];
  const activeRecord = active ? progressByStep.get(active.id) : undefined;
  const activeComplete =
    activeRecord?.status === "completed" || activeRecord?.status === "signed_off";
  const activeSignedOff = activeRecord?.status === "signed_off";
  const needsTrainer = active ? trainerSignoffTypes.includes(active.step_type) : false;
  const blockedOnTrainer = needsTrainer && !activeSignedOff;
  const activeIndex = active
    ? orderedSteps.findIndex((s) => s.stepId === active.id)
    : -1;
  const nextStep = activeIndex >= 0 ? orderedSteps[activeIndex + 1] : undefined;
  const isLastStep = activeIndex >= 0 && !nextStep;

  // Self-paced material that the trainer also covers hands-on later the same day.
  const activeDay = mod.day_assignment ?? 99;
  const dayHasTrainerStep = getDayGroupedSteps(planQuery.data ?? []).some(
    (entry) =>
      (entry.module.day_assignment ?? 99) === activeDay &&
      trainerSignoffTypes.includes(entry.step.step_type),
  );
  const showTrainerFollowUp = Boolean(active) && !needsTrainer && dayHasTrainerStep;

  const goNext = async () => {
    if (!active) return;
    if (!needsTrainer && !activeComplete && subjectId) {
      await toggle.mutateAsync({ stepId: active.id, completed: true });
    }
    if (nextStep) {
      void navigate({
        to: "/modules/$moduleId",
        params: { moduleId: nextStep.moduleId },
        search: { step: nextStep.stepId, ...(trainee ? { trainee } : {}) },
      });
    } else {
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← Today&apos;s training
        </Link>
        <div className="mt-2">
          <ModuleHeader
            as="h1"
            trackName={mod.track?.name}
            subPath={mod.sub_path}
            dayAssignment={mod.day_assignment}
            name={mod.name}
            description={mod.description}
          />
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[248px_1fr]">
        <nav className="space-y-0.5 rounded-lg border border-border bg-surface/60 p-2">
          {steps.map((s) => (
            <Link
              key={s.id}
              to="/modules/$moduleId"
              params={{ moduleId }}
              search={{ step: s.id }}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                active && s.id === active.id
                  ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
              }`}
            >
              <span className="shrink-0">{s.sequence_order}.</span>
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <StepStatusBadge status={s.content_status} />
            </Link>
          ))}
        </nav>

        <div className="space-y-6">
          {active ? (
            <StepRenderer
              step={active}
              quizzes={quizzes.filter((q) => q.step_id === active.id)}
              isAdmin={isAdmin}
              signedOff={activeSignedOff}
              canSignOff={Boolean(isAdmin && subjectId)}
              signingOff={signOff.isPending}
              onSignOff={() => signOff.mutate(active.id)}
            />
          ) : null}
          {showTrainerFollowUp ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5 shrink-0" aria-hidden="true" />
              Your trainer will also walk through this with you in person later today.
            </p>
          ) : null}
          {active ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <FlagStepButton stepId={active.id} stepTitle={active.title} moduleId={mod.id} />
              <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={activeComplete ? "secondary" : "outline"}
                disabled={
                  !employee || trainerSignoffTypes.includes(active.step_type) || toggle.isPending
                }
                onClick={() =>
                  toggle.mutate({ stepId: active.id, completed: !activeComplete })
                }
              >
                {trainerSignoffTypes.includes(active.step_type)
                  ? "Trainer sign-off required"
                  : activeComplete
                    ? "Completed — undo"
                    : "Mark complete"}
              </Button>
                <Button
                  size="sm"
                  disabled={blockedOnTrainer || toggle.isPending || planQuery.isPending}
                  onClick={() => void goNext()}
                >
                  {blockedOnTrainer
                    ? "Waiting on your trainer"
                    : isLastStep
                      ? "Finish"
                      : "Next"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
