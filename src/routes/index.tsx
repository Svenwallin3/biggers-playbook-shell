import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Compass, Lock, Search } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { AskAssistant } from "@/components/training/AskAssistant";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { LocationChoice, PathChoice } from "@/components/PathChoice";
import { ManagerDailyBrief } from "@/components/manager/ManagerDailyBrief";
import { useAuth } from "@/hooks/useAuth";
import type { PlanModule, ProgressRow } from "@/lib/training.queries";
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
  return <IndexPage />;
}

/** Simplified Hospitality-only view for a brand-new hire with no path yet. */
function HospitalityWelcome({
  module: mod,
  progressByStep,
  employeeName,
}: {
  module: PlanModule;
  progressByStep: Map<string, ProgressRow>;
  employeeName: string;
}) {
  const isDone = (stepId: string) => {
    const r = progressByStep.get(stepId);
    return r?.status === "completed" || r?.status === "signed_off";
  };
  const started = mod.steps.some((s) => progressByStep.get(s.id));
  const nextStep = mod.steps.find((s) => !isDone(s.id)) ?? mod.steps[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="space-y-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Welcome{employeeName ? `, ${employeeName}` : ""}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{mod.name}</h1>
        {mod.description ? (
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">{mod.description}</p>
        ) : null}
      </div>

      <div className="flex justify-center">
        <Button asChild size="lg" className="h-14 px-10 text-base">
          <Link
            to="/modules/$moduleId"
            params={{ moduleId: mod.id }}
            search={{ step: nextStep?.id, trainee: undefined }}
          >
            {started ? "Continue" : "Begin"}
          </Link>
        </Button>
      </div>

      {started ? (
        <Card>
          <CardContent className="py-4">
            <ul className="divide-y divide-border/70">
              {mod.steps.map((step) => {
                const complete = isDone(step.id);
                return (
                  <li key={step.id} className="flex items-center gap-3 py-2">
                    {complete ? (
                      <Check className="size-4 shrink-0 text-success" />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border border-border" />
                    )}
                    <Link
                      to="/modules/$moduleId"
                      params={{ moduleId: mod.id }}
                      search={{ step: step.id, trainee: undefined }}
                      className={`flex-1 text-sm hover:underline ${
                        complete ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {step.sequence_order}. {step.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {stepTypeLabels[step.step_type]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function IndexPage() {
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

  // First-login flow: staff start on Hospitality, and only pick a path once it's done.
  const isStaff = employee.auth_tier === "staff";
  if (isStaff && !employee.path) {
    if (planQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading your training…</p>;
    }
    const hospitality = modules[0];
    if (hospitality && allSteps.length > 0 && done === allSteps.length) {
      return <PathChoice />;
    }
    if (hospitality) {
      return (
        <HospitalityWelcome
          module={hospitality}
          progressByStep={progressByStep}
          employeeName={(employee.full_name ?? employee.email).split(" ")[0] ?? ""}
        />
      );
    }
  }
  if (isStaff && employee.path === "market" && !employee.location_id) {
    return <LocationChoice />;
  }

  return (
    <div className="space-y-6">
      {employee.auth_tier !== "staff" ? <ManagerDailyBrief employee={employee} /> : null}
      <section className="rounded-xl border border-border bg-linear-to-br from-primary/12 via-card to-accent/10 px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {employee.path ? `${employee.path} path` : "Path not set"} · {employee.auth_tier}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Welcome back, {(employee.full_name ?? employee.email).split(" ")[0]}
        </h1>

        <div className="mt-5">
          <AskAssistant />
        </div>

        <Link to="/search" className="mt-3 block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              placeholder="Search every module, step, and sourcing entry…"
              className="h-12 cursor-pointer border-border bg-card pl-9 text-base shadow-xs"
            />
          </div>
        </Link>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Your progress</span>
            <span className="text-muted-foreground">
              {done} of {allSteps.length} steps · {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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

        {modules.map((mod, modIndex) => {
          const moduleDone = mod.steps.every((s) => {
            const r = progressByStep.get(s.id);
            return r?.status === "completed" || r?.status === "signed_off";
          });
          const firstOpenIndex = modules.findIndex((m) =>
            m.steps.some((s) => {
              const r = progressByStep.get(s.id);
              return !(r?.status === "completed" || r?.status === "signed_off");
            }),
          );
          const isActive = modIndex === firstOpenIndex;
          const isFuture = firstOpenIndex !== -1 && modIndex > firstOpenIndex;
          return (
          <Card
            key={mod.id}
            className={
              isActive
                ? "border-primary/45 shadow-md ring-1 ring-primary/15"
                : isFuture
                  ? "border-dashed bg-muted/30 opacity-70"
                  : "bg-card/70"
            }
          >
            <CardContent className={isActive ? "py-5" : "py-4"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {isActive ? (
                      <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                        Up next
                      </span>
                    ) : moduleDone ? (
                      <Check className="size-3.5 text-success" />
                    ) : isFuture ? (
                      <Lock className="size-3 text-muted-foreground" />
                    ) : null}
                    {mod.track.name}
                    {mod.sub_path ? ` · ${mod.sub_path}` : ""}
                    {mod.day_assignment ? ` · Day ${mod.day_assignment}` : ""}
                  </p>
                  <Link
                    to="/modules/$moduleId"
                    params={{ moduleId: mod.id }}
                    search={{ step: undefined }}
                    className={`font-display font-semibold hover:underline ${
                      isActive ? "text-lg" : "text-base"
                    }`}
                  >
                    {mod.name}
                  </Link>
                  {mod.description && isActive ? (
                    <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                  ) : null}
                </div>
              </div>

              <ul className="mt-3 divide-y divide-border/70 border-t border-border/70">
                {mod.steps.map((step) => {
                  const record = progressByStep.get(step.id);
                  const complete =
                    record?.status === "completed" || record?.status === "signed_off";
                  const trainerOnly = trainerSignoffTypes.includes(step.step_type);
                  return (
                    <li
                      key={step.id}
                      className={`flex flex-wrap items-center justify-between gap-2 py-1.5 ${
                        complete ? "opacity-60" : ""
                      }`}
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
                          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                            {stepTypeLabels[step.step_type]}
                          </span>
                          <StepStatusBadge status={step.content_status} />
                          {trainerOnly && !complete ? (
                            <span className="text-xs font-medium text-accent">
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
          );
        })}
      </section>

      <Link to="/reference/sourcing" className="block">
        <Card className="border-accent/30 bg-accent/8 transition-colors hover:border-accent">
          <CardContent className="flex items-center gap-3 py-4">
            <Compass className="size-5 text-accent" />
            <div className="flex-1">
              <p className="font-display text-sm font-semibold">Sourcing Board</p>
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
