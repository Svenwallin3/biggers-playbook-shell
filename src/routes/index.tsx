import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Compass, Search } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  planQueryOptions,
  progressQueryOptions,
  setStepProgress,
  stepTypeLabels,
  trainerSignoffTypes,
} from "@/lib/training.queries";

const title = "Today's training — Biggers Training Platform";
const description =
  "Your assigned training modules and steps for today at Biggers Market.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  const { employee, loading, session } = useAuth();
  const queryClient = useQueryClient();

  const planQuery = useQuery({ ...planQueryOptions(employee?.path ?? null), enabled: !!employee });
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your training…</p>;
  }

  if (!session || !employee) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-sm font-medium">Sign in to see today&apos;s training</p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  const modules = planQuery.data ?? [];
  const allSteps = modules.flatMap((m) => m.steps);
  const done = allSteps.filter(
    (s) => progressByStep.get(s.id)?.status === "completed" ||
      progressByStep.get(s.id)?.status === "signed_off",
  ).length;
  const pct = Math.round((done / Math.max(allSteps.length, 1)) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {(employee.full_name ?? employee.email).split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {employee.path ? `${employee.path} path` : "Path not set"} · {employee.auth_tier}
        </p>
      </div>

      <Link to="/search" className="block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            placeholder="Search every module, step, and sourcing entry…"
            className="h-12 cursor-pointer pl-9 text-base"
          />
        </div>
      </Link>

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Your progress</span>
            <span className="text-muted-foreground">
              {done} of {allSteps.length} steps
            </span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today, in order
        </h2>

        {planQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading modules…</p>
        ) : null}
        {planQuery.isError ? (
          <p className="text-sm text-destructive">Couldn&apos;t load your modules.</p>
        ) : null}
        {!planQuery.isPending && !modules.length ? (
          <p className="text-sm text-muted-foreground">
            No modules are assigned to your path yet.
          </p>
        ) : null}

        {modules.map((mod) => (
          <Card key={mod.id}>
            <CardContent className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {mod.track.name}
                    {mod.sub_path ? ` · ${mod.sub_path}` : ""}
                    {mod.day_assignment ? ` · Day ${mod.day_assignment}` : ""}
                  </p>
                  <Link
                    to="/modules/$moduleId"
                    params={{ moduleId: mod.id }}
                    search={{ step: undefined }}
                    className="text-base font-semibold hover:underline"
                  >
                    {mod.name}
                  </Link>
                  {mod.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                  ) : null}
                </div>
              </div>

              <ul className="mt-4 divide-y divide-border border-t border-border">
                {mod.steps.map((step) => {
                  const record = progressByStep.get(step.id);
                  const complete =
                    record?.status === "completed" || record?.status === "signed_off";
                  const trainerOnly = trainerSignoffTypes.includes(step.step_type);
                  return (
                    <li
                      key={step.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Checkbox
                          checked={complete}
                          disabled={trainerOnly || toggle.isPending}
                          aria-label={
                            trainerOnly
                              ? "Trainer sign-off required"
                              : `Mark ${step.title} complete`
                          }
                          onCheckedChange={(value) =>
                            toggle.mutate({ stepId: step.id, completed: value === true })
                          }
                        />
                        <Link
                          to="/modules/$moduleId"
                          params={{ moduleId: mod.id }}
                          search={{ step: step.id }}
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm hover:underline"
                        >
                          <span className={complete ? "text-muted-foreground line-through" : ""}>
                            {step.sequence_order}. {step.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stepTypeLabels[step.step_type]}
                          </span>
                          <StepStatusBadge status={step.content_status} />
                          {trainerOnly && !complete ? (
                            <span className="text-xs text-muted-foreground">
                              Trainer sign-off
                            </span>
                          ) : null}
                        </Link>
                      </div>
                      <FlagStepButton
                        stepId={step.id}
                        stepTitle={step.title}
                        moduleId={mod.id}
                      />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <Link to="/sourcing-board" className="block">
        <Card className="transition-colors hover:border-primary">
          <CardContent className="flex items-center gap-3 py-5">
            <Compass className="size-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sourcing Board</p>
              <p className="text-sm text-muted-foreground">
                Where our products come from — guest questions, answered
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
