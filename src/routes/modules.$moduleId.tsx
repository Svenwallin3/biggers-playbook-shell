import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  moduleQueryOptions,
  progressQueryOptions,
  setStepProgress,
  trainerSignoffTypes,
} from "@/lib/training.queries";

export const Route = createFileRoute("/modules/$moduleId")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: typeof search["step"] === "string" ? search["step"] : undefined,
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
  const { step: stepParam } = Route.useSearch();
  const { employee } = useAuth();
  const queryClient = useQueryClient();

  const moduleQuery = useQuery(moduleQueryOptions(moduleId));
  const progressQuery = useQuery(progressQueryOptions(employee?.id));

  const progressByStep = new Map(
    (progressQuery.data ?? []).map((record) => [record.step_id, record]),
  );

  const toggle = useMutation({
    mutationFn: (input: { stepId: string; completed: boolean }) =>
      setStepProgress({
        employeeId: employee!.id,
        stepId: input.stepId,
        completed: input.completed,
        existingId: progressByStep.get(input.stepId)?.id,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress", employee?.id] }),
    onError: (error: Error) => toast.error("Couldn't save that", { description: error.message }),
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
  const isAdmin = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← Today&apos;s training
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {mod.track?.name}
          {mod.sub_path ? ` · ${mod.sub_path}` : ""}
          {mod.day_assignment ? ` · Day ${mod.day_assignment}` : ""}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{mod.name}</h1>
        {mod.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
        ) : null}
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {steps.map((s) => (
            <Link
              key={s.id}
              to="/modules/$moduleId"
              params={{ moduleId }}
              search={{ step: s.id }}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active && s.id === active.id
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
