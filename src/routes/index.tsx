import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, ChevronRight, GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepTypeChip } from "@/components/training/StepTypeChip";
import { ProgressRing } from "@/components/training/ProgressRing";
import { DivisionChoice, LocationChoice, PathChoice } from "@/components/PathChoice";
import {
  ManagerTileGrid,
  QuickActionRow,
  SourcingTile,
  StandardOfTheDay,
} from "@/components/manager/ManagerDailyBrief";
import { useAuth } from "@/hooks/useAuth";
import type { PlanModule, ProgressRow } from "@/lib/training.queries";
import {
  employeeSecondaryDivisionsQueryOptions,
  toSecondaryDivisions,
} from "@/lib/cross-training.queries";
import {
  planQueryOptions,
  progressQueryOptions,
  branchOptionsQueryOptions,
} from "@/lib/training.queries";
import { onboardingCompletionQueryOptions } from "@/lib/queue.queries";

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

  const secondaryQuery = useQuery(employeeSecondaryDivisionsQueryOptions(employee?.id));
  const planQuery = useQuery({
    ...planQueryOptions(
      employee?.department_scope ?? null,
      employee?.path ?? null,
      false,
      toSecondaryDivisions(secondaryQuery.data),
    ),
    enabled: !!employee && !secondaryQuery.isPending,
  });
  const progressQuery = useQuery(progressQueryOptions(employee?.id));
  const branchQuery = useQuery(branchOptionsQueryOptions(employee?.department_scope ?? null));
  const onboardingQuery = useQuery({
    ...onboardingCompletionQueryOptions(),
    enabled: !!employee,
  });

  const progressByStep = new Map(
    (progressQuery.data ?? []).map((record) => [record.step_id, record]),
  );

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

  // First-login flow: staff start on Hospitality, and only pick a division once it's done.
  const isStaff = employee.auth_tier === "staff";
  if (isStaff && !employee.department_scope) {
    if (planQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading your training…</p>;
    }
    const hospitality = modules[0];
    if (hospitality && allSteps.length > 0 && done === allSteps.length) {
      return <DivisionChoice />;
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
  if (isStaff && employee.department_scope === "market" && !employee.location_id) {
    return <LocationChoice />;
  }
  // Path gate: only for divisions that actually split (2+ path values), and
  // once Day 1 is done — the path pick is the first thing shown on Day 2.
  if (
    isStaff &&
    employee.department_scope &&
    !employee.path &&
    (branchQuery.data ?? []).length >= 2
  ) {
    const earlySteps = modules
      .filter((m) => m.day_assignment === 1)
      .flatMap((m) => m.steps);
    const earlyDone = earlySteps.every((s) => {
      const status = progressByStep.get(s.id)?.status;
      return status === "completed" || status === "signed_off";
    });
    if (!planQuery.isPending && earlySteps.length > 0 && earlyDone) {
      return <PathChoice department={employee.department_scope} />;
    }
  }


  const isManagerTier = employee.auth_tier !== "staff";
  const ownOnboarding = onboardingQuery.data?.[employee.id];
  const onboardingIncomplete =
    !!ownOnboarding && ownOnboarding.total > 0 && ownOnboarding.completed < ownOnboarding.total;
  const showHero = !!upNext && (!isManagerTier || onboardingIncomplete);

  return (
    <div className="space-y-5">
      <StandardOfTheDay employee={employee} />

      <QuickActionRow />

      {isManagerTier ? <ManagerTileGrid employee={employee} /> : null}

      {showHero && upNext ? (
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
      ) : null}

      {!isManagerTier ? <SourcingTile /> : null}

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {isManagerTier && upNext ? (
          <Link
            to="/modules/$moduleId"
            params={{ moduleId: upNext.module.id }}
            search={{ step: upNext.step.id, trainee: undefined }}
            className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/50"
          >
            <GraduationCap className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              Your training · today
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : null}
        <Link
          to="/training-library"
          className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/50"
        >
          <BookOpen className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">Browse all training</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
