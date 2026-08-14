import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Lock,
  PartyPopper,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { AskAssistant } from "@/components/training/AskAssistant";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { StepTypeChip } from "@/components/training/StepTypeChip";
import { ProgressRing } from "@/components/training/ProgressRing";
import { trackTheme } from "@/lib/track-theme";
import { LocationChoice, PathChoice, SubPathChoice } from "@/components/PathChoice";
import { ManagerDailyBrief } from "@/components/manager/ManagerDailyBrief";
import { MascotImage } from "@/components/brand/MascotImage";
import { ReportDeliveryIssueDialog } from "@/components/sourcing/ReportDeliveryIssueDialog";
import { useAuth } from "@/hooks/useAuth";
import type { PlanModule, ProgressRow } from "@/lib/training.queries";
import {
  planQueryOptions,
  progressQueryOptions,
  setStepProgress,
  trainerSignoffTypes,
  branchOptionsQueryOptions,
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
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {mod.name}
        </h1>
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
                    <StepTypeChip type={step.step_type} />
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
  const [reportOpen, setReportOpen] = useState(false);

  const planQuery = useQuery({
    ...planQueryOptions(employee?.department_scope ?? null, employee?.sub_path ?? null),
    enabled: !!employee,
  });
  const progressQuery = useQuery(progressQueryOptions(employee?.id));
  const branchQuery = useQuery(branchOptionsQueryOptions(employee?.department_scope ?? null));

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
  const trainingComplete = allSteps.length > 0 && done === allSteps.length;
  // The single "one thing to do next" across the whole ordered plan.
  const upNext = (() => {
    for (const mod of modules) {
      for (const step of mod.steps) {
        const record = progressByStep.get(step.id);
        if (record?.status === "completed" || record?.status === "signed_off") continue;
        return { module: mod, step };
      }
    }
    return null;
  })();

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
  // Branch gate: only for divisions that actually split (2+ branch values), and
  // only once Days 1-2 of shared content are done. Day 4's shared modules are
  // deliberately excluded — waiting on them would push this to the last day.
  if (isStaff && employee.path && !employee.sub_path && (branchQuery.data ?? []).length >= 2) {
    const earlySteps = modules
      .filter((m) => m.day_assignment === 1 || m.day_assignment === 2)
      .flatMap((m) => m.steps);
    const earlyDone = earlySteps.every((s) => {
      const status = progressByStep.get(s.id)?.status;
      return status === "completed" || status === "signed_off";
    });
    if (!planQuery.isPending && earlySteps.length > 0 && earlyDone) {
      return <SubPathChoice department={employee.department_scope} />;
    }
  }

  return (
    <div className="space-y-6">
      {employee.auth_tier !== "staff" ? <ManagerDailyBrief employee={employee} /> : null}
      {upNext && !trainingComplete ? (
        <section className="overflow-hidden rounded-2xl bg-linear-to-br from-hero to-hero-edge text-hero-foreground shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-5 px-5 py-6 sm:gap-6 sm:px-8 sm:py-7">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-bright">
                Up next · {upNext.module.track.name}
                {upNext.module.day_assignment ? ` · Day ${upNext.module.day_assignment}` : ""}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {upNext.step.title}
              </h1>
              <p className="mt-2 text-sm text-hero-foreground/75">
                {upNext.module.name} · step {upNext.step.sequence_order} of{" "}
                {upNext.module.steps.length}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-accent px-7 text-base font-semibold text-accent-foreground hover:bg-accent-bright"
                >
                  <Link
                    to="/modules/$moduleId"
                    params={{ moduleId: upNext.module.id }}
                    search={{ step: upNext.step.id, trainee: undefined }}
                  >
                    {done > 0 ? "Continue" : "Start"}
                    {upNext.module.day_assignment
                      ? ` Day ${upNext.module.day_assignment}: `
                      : ": "}
                    {upNext.module.name}
                  </Link>
                </Button>
                <span className="text-sm text-hero-foreground/70">
                  {done} of {allSteps.length} steps done
                </span>
              </div>
            </div>
            <div className="text-hero-foreground">
              <ProgressRing value={pct} size={76} label={`${pct}% of your training complete`} />
            </div>
          </div>
          <div className="h-1.5 w-full bg-hero-foreground/15">
            <div
              className="h-full bg-accent-bright transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-primary/25 bg-primary-tint px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PartyPopper className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Training complete, {(employee.full_name ?? employee.email).split(" ")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">
                {allSteps.length
                  ? `All ${allSteps.length} steps signed off. Come back any time for a refresher.`
                  : "No modules are assigned to your path yet."}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/training-library">
                <BookOpen className="mr-1.5 size-4" />
                Browse all training
              </Link>
            </Button>
            <MascotImage path="mascot/empty.png" alt="" />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card px-5 py-5">
        <AskAssistant />
        <Link to="/search" className="mt-3 block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              placeholder="Search every module, step, and sourcing entry…"
              className="h-12 cursor-pointer border-border bg-background pl-9 text-base shadow-xs"
            />
          </div>
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setReportOpen(true)}>
            <AlertTriangle className="mr-1.5 size-4" />
            Report a delivery issue
          </Button>
          {trainingComplete ? null : (
            <span className="text-xs text-muted-foreground">
              Something wrong with a truck order? Tell us here — anyone can report.
            </span>
          )}
        </div>
      </section>

      <ReportDeliveryIssueDialog open={reportOpen} onOpenChange={setReportOpen} />

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
          const theme = trackTheme(mod.track.name);
          return (
          <Card
            key={mod.id}
            className={
              "relative overflow-hidden pl-1.5 " +
              (isActive
                ? "border-primary/45 shadow-md ring-1 ring-primary/15"
                : isFuture
                  ? "border-dashed bg-muted/30 opacity-70"
                  : "bg-card/70")
            }
          >
            <span
              className={`absolute inset-y-0 left-0 w-1.5 ${theme.rail} ${isFuture ? "opacity-40" : ""}`}
              aria-hidden
            />
            <CardContent className={isActive ? "py-5" : "py-4"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p
                    className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      isFuture ? "text-muted-foreground" : theme.label
                    }`}
                  >
                    {isActive ? (
                      <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                        In progress
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
                      isActive ? "text-xl" : "text-base"
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
                          <StepTypeChip type={step.step_type} />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/training-library" className="block">
          <Card className="h-full border-primary/30 bg-primary/8 transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <BookOpen className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-base font-semibold">Browse all training</p>
                <p className="text-sm text-muted-foreground">
                  Refreshers on anything you&apos;ve already covered
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/reference/sourcing" className="block">
          <Card className="h-full border-accent/35 bg-accent/10 transition-colors hover:border-accent">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                <Compass className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-base font-semibold">Sourcing Board</p>
                <p className="text-sm text-muted-foreground">
                  Where our products come from — guest questions, answered
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
