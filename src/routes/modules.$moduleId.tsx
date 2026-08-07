import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  moduleQueryOptions,
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
  const isAdmin = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";
  // A manager can be standing with the trainee; otherwise these are the viewer's own records.
  const subjectId = (isAdmin && trainee) || employee?.id;

  const moduleQuery = useQuery(moduleQueryOptions(moduleId));
  const progressQuery = useQuery(progressQueryOptions(subjectId));

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
          {active ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <FlagStepButton stepId={active.id} stepTitle={active.title} moduleId={mod.id} />
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
