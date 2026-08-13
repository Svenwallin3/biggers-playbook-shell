import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Eye, Lock, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { ModuleEditPanel, StepEditPanel } from "@/components/admin/EntityEditPanels";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { StepTypeChip } from "@/components/training/StepTypeChip";
import { trackTheme } from "@/lib/track-theme";
import { useAuth } from "@/hooks/useAuth";
import {
  getDayGroupedSteps,
  logManagerInitials,
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
  ): { step?: string | undefined; trainee?: string | undefined; preview?: boolean | undefined } => ({
    step: typeof search["step"] === "string" ? search["step"] : undefined,
    // Set when a manager opens the module from the training queue for a specific trainee.
    trainee: typeof search["trainee"] === "string" ? search["trainee"] : undefined,
    // Manager/owner read-only walkthrough — never writes progress.
    preview:
      search["preview"] === true || search["preview"] === "1" || search["preview"] === "true"
        ? true
        : undefined,
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
  const { step: stepParam, trainee, preview } = Route.useSearch();
  const { employee, isGeneralManager, isOwner, isManagerOrOwner } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stepSheetOpen, setStepSheetOpen] = useState(false);
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false);
  const isAdmin = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";
  // Preview is ignored entirely for non-admins, so a staff member can't opt out of real progress.
  const previewMode = Boolean(preview) && isAdmin;
  // A manager can be standing with the trainee; otherwise these are the viewer's own records.
  const subjectId = previewMode ? undefined : (isAdmin && trainee) || employee?.id;

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
  const walk = getDayGroupedSteps(planQuery.data ?? []);
  const orderedSteps = walk.map((entry) => ({
    moduleId: entry.module.id,
    stepId: entry.step.id,
    day: entry.module.day_assignment ?? 99,
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

  const logInitials = useMutation({
    mutationFn: (stepId: string) =>
      logManagerInitials({
        employeeId: subjectId!,
        stepId,
        signedOffBy: employee!.id,
        existingId: progressByStep.get(stepId)?.id,
      }),
    onSuccess: () => {
      toast.success("Initials logged");
      void queryClient.invalidateQueries({ queryKey: ["progress", subjectId] });
    },
    onError: (error: Error) =>
      toast.error("Couldn't log initials", { description: error.message }),
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
  // Mirrors the gating in /admin/content — RLS is still the real boundary.
  const inDivision = mod.track?.department === employee?.department_scope;
  const canEditDirect = isOwner || (isGeneralManager && inDivision);
  const canSuggest = isManagerOrOwner && !canEditDirect && inDivision;
  const active = steps.find((s) => s.id === stepParam) ?? steps[0];
  const activeRecord = active ? progressByStep.get(active.id) : undefined;
  const activeComplete =
    activeRecord?.status === "completed" || activeRecord?.status === "signed_off";
  const activeSignedOff = activeRecord?.status === "signed_off";
  const needsTrainer = active ? trainerSignoffTypes.includes(active.step_type) : false;
  const blockedOnTrainer = !previewMode && needsTrainer && !activeSignedOff;
  const activeIndex = active
    ? orderedSteps.findIndex((s) => s.stepId === active.id)
    : -1;
  const nextStep = activeIndex >= 0 ? orderedSteps[activeIndex + 1] : undefined;
  const prevStep = activeIndex > 0 ? orderedSteps[activeIndex - 1] : undefined;
  const isLastStep = activeIndex >= 0 && !nextStep;

  const theme = trackTheme(mod.track?.name);
  const stepNumber = steps.findIndex((s) => s.id === active?.id) + 1;
  const modulePct = Math.round(
    (steps.filter((s) => {
      const r = progressByStep.get(s.id);
      return r?.status === "completed" || r?.status === "signed_off";
    }).length /
      Math.max(steps.length, 1)) *
      100,
  );

  // Self-paced material that the trainer also covers hands-on later the same day.
  const activeDay = mod.day_assignment ?? 99;
  const dayHasTrainerStep = walk.some(
    (entry) =>
      (entry.module.day_assignment ?? 99) === activeDay &&
      trainerSignoffTypes.includes(entry.step.step_type),
  );
  const showTrainerFollowUp = Boolean(active) && !needsTrainer && dayHasTrainerStep;

  const isStepDone = (stepId: string) => {
    const r = progressByStep.get(stepId);
    return r?.status === "completed" || r?.status === "signed_off";
  };

  // Today's modules — same day as the step being viewed, in plan order.
  const dayModules = (planQuery.data ?? []).filter(
    (m) => (m.day_assignment ?? 99) === activeDay,
  );
  const firstOpenDayIndex = dayModules.findIndex((m) =>
    m.steps.some((s) => !isStepDone(s.id)),
  );
  const daySteps = walk.filter((entry) => (entry.module.day_assignment ?? 99) === activeDay);
  const dayDone = daySteps.filter((entry) => isStepDone(entry.step.id)).length;
  const dayPct = Math.round((dayDone / Math.max(daySteps.length, 1)) * 100);

  // Soft end-of-day stop: the walk continues, but on a different day.
  const isEndOfDay = Boolean(active) && !isLastStep && nextStep ? nextStep.day !== activeDay : false;

  const dayModuleLink = (m: (typeof dayModules)[number]) => {
    const target = m.steps.find((s) => !isStepDone(s.id)) ?? m.steps[0];
    return { moduleId: m.id, stepId: target?.id };
  };

  const goNext = async () => {
    if (!active) return;
    if (!previewMode && !needsTrainer && !activeComplete && subjectId) {
      await toggle.mutateAsync({ stepId: active.id, completed: true });
    }
    if (nextStep) {
      void navigate({
        to: "/modules/$moduleId",
        params: { moduleId: nextStep.moduleId },
        search: {
          step: nextStep.stepId,
          ...(trainee ? { trainee } : {}),
          ...(previewMode ? { preview: true } : {}),
        },
      });
    } else {
      void navigate({ to: "/" });
    }
  };

  const goPrevious = () => {
    if (!prevStep) return;
    void navigate({
      to: "/modules/$moduleId",
      params: { moduleId: prevStep.moduleId },
      search: {
        step: prevStep.stepId,
        ...(trainee ? { trainee } : {}),
        ...(previewMode ? { preview: true } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      {previewMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
          <Eye className="size-4 text-warning" aria-hidden="true" />
          <p className="text-sm font-semibold text-warning">
            Previewing as a new hire — nothing here is being saved
          </p>
          <p className="text-xs text-warning/90">
            No progress, sign-offs, or completions are recorded in this mode.
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← Today&apos;s training
        </Link>
      </div>

      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <ModuleHeader
              as="h2"
              variant="compact"
              trackName={mod.track?.name}
              subPath={mod.sub_path}
              dayAssignment={mod.day_assignment}
              name={mod.name}
            />
            {canEditDirect ? (
              <Sheet open={moduleSheetOpen} onOpenChange={setModuleSheetOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        aria-label="Edit this module"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                <SheetContent
                  side="right"
                  className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl"
                >
                  <SheetHeader>
                    <SheetTitle>Edit module</SheetTitle>
                    <SheetDescription>
                      Changes save straight to this module and are logged to version history.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-6">
                    <ModuleEditPanel
                      module={mod}
                      trackName={mod.track?.name}
                      canEdit={canEditDirect}
                      employeeId={employee?.id}
                      deleteRequiresApproval={isGeneralManager && !isOwner}
                      onSaved={() => setModuleSheetOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
          <p className="shrink-0 text-xs font-medium text-muted-foreground">
            Step {stepNumber} of {steps.length}
          </p>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((s) => {
            const r = progressByStep.get(s.id);
            const doneStep = r?.status === "completed" || r?.status === "signed_off";
            return (
              <span
                key={s.id}
                className={`h-1 flex-1 rounded-full ${
                  doneStep
                    ? "bg-accent-bright"
                    : s.id === active?.id
                      ? "bg-primary/60"
                      : "bg-border"
                }`}
              />
            );
          })}
        </div>
        <span className="sr-only">{modulePct}% of this module complete</span>
      </div>

      {mod.description ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-accent/50 bg-accent/10 px-5 py-5 sm:px-7 sm:py-6">
          <span className={`absolute inset-y-0 left-0 w-1.5 ${theme.rail}`} aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-foreground/70">
            Read this first
          </p>
          <p className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
            {mod.description}
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[248px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4 self-start md:sticky md:top-24">
          {dayModules.length ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Today&apos;s modules
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0 md:rounded-lg md:border md:border-border md:bg-surface/60 md:p-2">
                {dayModules.map((m, i) => {
                  const doneModule = m.steps.length > 0 && m.steps.every((s) => isStepDone(s.id));
                  const isActiveModule = m.id === mod.id;
                  const isFuture = firstOpenDayIndex !== -1 && i > firstOpenDayIndex;
                  const target = dayModuleLink(m);
                  return (
                    <Link
                      key={m.id}
                      to="/modules/$moduleId"
                      params={{ moduleId: target.moduleId }}
                      search={{
                        step: target.stepId,
                        ...(trainee ? { trainee } : {}),
                        ...(previewMode ? { preview: true } : {}),
                      }}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors md:w-full md:shrink md:whitespace-normal md:border-0 md:text-sm ${
                        isActiveModule
                          ? "border-primary/40 bg-card font-semibold text-foreground ring-1 ring-primary/25"
                          : "border-border text-muted-foreground hover:bg-card/70 hover:text-foreground"
                      } ${isFuture && !isActiveModule ? "opacity-60" : ""}`}
                    >
                      {doneModule ? (
                        <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                      ) : isFuture ? (
                        <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                      ) : null}
                      <span className="min-w-0 md:truncate">{m.name}</span>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {dayDone} of {daySteps.length} steps done today
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                <span
                  className="block h-full rounded-full bg-accent-bright transition-[width]"
                  style={{ width: `${dayPct}%` }}
                />
              </div>
            </div>
          ) : null}
          <nav className="min-w-0 space-y-0.5 rounded-lg border border-border bg-surface/60 p-2">
          {steps.map((s) => (
            <Link
              key={s.id}
              to="/modules/$moduleId"
              params={{ moduleId }}
              search={{ step: s.id, ...(previewMode ? { preview: true } : {}) }}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                active && s.id === active.id
                  ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
              }`}
            >
              <span className="shrink-0">{s.sequence_order}.</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.title}</span>
                <span className="mt-1 block">
                  <StepTypeChip type={s.step_type} />
                </span>
              </span>
              <StepStatusBadge status={s.content_status} />
            </Link>
          ))}
          </nav>
        </div>

        <div className="min-w-0 space-y-6">
          {active ? (
            <StepRenderer
              step={active}
              titleAs="h1"
              titleAction={
                canEditDirect || canSuggest ? (
                  <Sheet open={stepSheetOpen} onOpenChange={setStepSheetOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SheetTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Edit this step">
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        </SheetTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <SheetContent
                      side="right"
                      className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl"
                    >
                      <SheetHeader>
                        <SheetTitle>Edit step</SheetTitle>
                        <SheetDescription>
                          {canEditDirect
                            ? "Saves straight to this step, with the previous version logged."
                            : "Your changes go to the Owner approval queue."}
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 space-y-6">
                        <StepEditPanel
                          key={active.id}
                          step={active}
                          stepModule={mod}
                          canEditDirect={canEditDirect}
                          canSuggest={canSuggest}
                          employeeId={employee?.id}
                          onSaved={() => setStepSheetOpen(false)}
                        />
                        {active.step_type === "quiz" ? (
                          <QuizQuestionsPanel key={`quiz-${active.id}`} stepId={active.id} />
                        ) : null}
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : null
              }
              quizzes={quizzes.filter((q) => q.step_id === active.id)}
              isAdmin={isAdmin}
              signedOff={previewMode ? false : activeSignedOff}
              canSignOff={Boolean(!previewMode && isAdmin && subjectId)}
              signingOff={signOff.isPending}
              onSignOff={() => signOff.mutate(active.id)}
              initialedBy={previewMode ? null : (activeRecord?.signed_off_by ?? null)}
              initialedAt={previewMode ? null : (activeRecord?.signed_off_at ?? null)}
              loggingInitials={logInitials.isPending}
              onLogInitials={
                !previewMode && isAdmin && subjectId
                  ? () => logInitials.mutate(active.id)
                  : undefined
              }
            />
          ) : null}
          {showTrainerFollowUp ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5 shrink-0" aria-hidden="true" />
              Your trainer will also walk through this with you in person later today.
            </p>
          ) : null}
          {active ? (
            <div className="space-y-3 border-t border-border pt-4">
              {isEndOfDay ? (
                <div className="rounded-xl border-2 border-accent/50 bg-accent/10 px-5 py-5 text-center">
                  <p className="font-display text-lg font-semibold text-foreground">
                    You&apos;ve finished today&apos;s material
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Find your manager or trainer to continue.
                  </p>
                  <Button asChild className="mt-4 h-11">
                    <Link to="/">Back to home</Link>
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={!prevStep || planQuery.isPending}
                  onClick={goPrevious}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Button>
                {isEndOfDay ? null : (
                <Button
                  className="h-11 w-full"
                  disabled={blockedOnTrainer || toggle.isPending || planQuery.isPending}
                  onClick={() => void goNext()}
                >
                  {blockedOnTrainer
                    ? "Waiting on your trainer"
                    : isLastStep
                      ? "Finish"
                      : "Next"}
                  {blockedOnTrainer ? null : <ChevronRight className="size-4" aria-hidden />}
                </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <FlagStepButton stepId={active.id} stepTitle={active.title} moduleId={mod.id} />
                </div>
                {!needsTrainer && activeComplete && !previewMode ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!employee || toggle.isPending}
                    onClick={() => toggle.mutate({ stepId: active.id, completed: false })}
                  >
                    Completed — undo
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
