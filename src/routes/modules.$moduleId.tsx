import { useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
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
import { SuggestChangeButton } from "@/components/training/SuggestChangeButton";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { TraineeWalk } from "@/components/training/TraineeWalk";
import { StandaloneModuleBuilder } from "@/components/admin/StandaloneModuleBuilder";
import { ModuleThemeCard, introCardText } from "@/components/training/ModuleThemeCard";
import { useAuth } from "@/hooks/useAuth";
import {
  employeeSecondaryDivisionsQueryOptions,
  toSecondaryDivisions,
} from "@/lib/cross-training.queries";
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
  ): {
    step?: string | undefined;
    trainee?: string | undefined;
    preview?: boolean | undefined;
  } => ({
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
      {error instanceof Error ? error.message : String(error)}
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
  // Standalone-module builder: temporarily swap into the trainee-accurate walk.
  const [traineePreview, setTraineePreview] = useState(false);
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
        .select("department_scope, path_id, auth_tier")
        .eq("id", subjectId!)
        .maybeSingle();
      if (error) throw error;
      return {
        department_scope: data?.department_scope ?? null,
        path_id: data?.path_id ?? null,
        is_manager: data?.auth_tier !== "staff",
      };
    },
  });
  const subjectDepartment =
    isAdmin && trainee
      ? (traineeQuery.data?.department_scope ?? null)
      : (employee?.department_scope ?? null);
  const subjectPath =
    isAdmin && trainee ? (traineeQuery.data?.path_id ?? null) : (employee?.path_id ?? null);
  const subjectIsGm =
    isAdmin && trainee
      ? (traineeQuery.data?.is_manager ?? false)
      : employee?.auth_tier !== "staff";
  const secondaryQuery = useQuery(employeeSecondaryDivisionsQueryOptions(subjectId));
  const planQuery = useQuery({
    ...planQueryOptions(
      subjectDepartment,
      subjectPath,
      false,
      toSecondaryDivisions(secondaryQuery.data),
      subjectIsGm,
    ),
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
    mutationFn: ({
      stepId,
      notes,
      checklistConfirmed,
    }: {
      stepId: string;
      notes?: string | undefined;
      checklistConfirmed?: string[] | undefined;
    }) =>
      signOffStep({
        employeeId: subjectId!,
        stepId,
        signedOffBy: employee!.id,
        existingId: progressByStep.get(stepId)?.id,
        notes,
        checklistConfirmed,
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
    onError: (error: Error) => toast.error("Couldn't log initials", { description: error.message }),
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

  // Standalone (non-day) modules are authored as one flat page, never a paginated walk.
  // Only ever true for an editor in preview mode — real trainees are untouched.
  if (previewMode && canEditDirect && mod.day_assignment === null && !traineePreview) {
    const canCreateHere =
      isOwner ||
      (isGeneralManager &&
        !!mod.track?.department &&
        mod.track.department === employee?.department_scope);
    return (
      <div className="space-y-6">
        <BackLink />
        <StandaloneModuleBuilder
          module={mod}
          canEditDirect={canEditDirect}
          canSuggest={canSuggest}
          canCreate={canCreateHere}
          employeeId={employee?.id}
          deleteRequiresApproval={isGeneralManager && !isOwner}
          onPreviewAsTrainee={async () => {
            await moduleQuery.refetch();
            setTraineePreview(true);
          }}

        />
      </div>
    );
  }

  if (!steps.length) {
    return <p className="text-sm text-muted-foreground">This module has no steps yet.</p>;
  }

  const active = steps.find((s) => s.id === stepParam) ?? steps[0]!;
  const activeRecord = progressByStep.get(active.id);
  const activeComplete =
    activeRecord?.status === "completed" || activeRecord?.status === "signed_off";
  const activeSignedOff = activeRecord?.status === "signed_off";
  const needsTrainer = trainerSignoffTypes.includes(active.step_type);
  const blockedOnTrainer = !previewMode && needsTrainer && !activeSignedOff;
  const activeIndex = orderedSteps.findIndex((s) => s.stepId === active.id);
  const nextStep = activeIndex >= 0 ? orderedSteps[activeIndex + 1] : undefined;
  const prevStep = activeIndex > 0 ? orderedSteps[activeIndex - 1] : undefined;

  const stepNumber = steps.findIndex((s) => s.id === active?.id) + 1;
  const modulePct = Math.round(
    (steps.filter((s) => {
      const r = progressByStep.get(s.id);
      return r?.status === "completed" || r?.status === "signed_off";
    }).length /
      Math.max(steps.length, 1)) *
      100,
  );

  const isStepDone = (stepId: string) => {
    const r = progressByStep.get(stepId);
    return r?.status === "completed" || r?.status === "signed_off";
  };

  // The plan's copy of this module (so the shared walk keeps day context); if the
  // module isn't in the viewer's plan, fall back to walking it on its own.
  const walkModule = (planQuery.data ?? []).find((m) => m.id === mod.id) ?? { ...mod, steps };
  const walkEntries = walk.some((w) => w.module.id === mod.id)
    ? walk
    : getDayGroupedSteps([walkModule]);

  const goNext = async () => {
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
      {traineePreview ? (
        <Button variant="outline" size="sm" onClick={() => setTraineePreview(false)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to builder
        </Button>
      ) : null}
      {previewMode ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-warning/40 bg-warning-soft px-3 py-1.5">
          <Eye className="size-3.5 text-warning" aria-hidden="true" />
          <p className="text-xs font-semibold text-warning">
            Preview mode — trainee progress isn&apos;t recorded
          </p>
          <p className="text-xs text-warning/90">
            Edits you make with the pencil are saved for real.
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <BackLink />
      </div>

      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <ModuleHeader
              as="h2"
              variant="compact"
              trackName={mod.track?.name}
              path={mod.path}
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

      <TraineeWalk
        contentHeader={
          <ModuleThemeCard
            description={introCardText(active, mod.description)}
            trackName={mod.track?.name}
          />
        }
        walk={walkEntries}
        activeModule={walkModule}
        activeStep={active}
        isStepDone={isStepDone}
        allowFreeNav={isAdmin}
        onNavigate={(targetModuleId: string, targetStepId: string) =>
          void navigate({
            to: "/modules/$moduleId",
            params: { moduleId: targetModuleId },
            search: {
              step: targetStepId,
              ...(trainee ? { trainee } : {}),
              ...(previewMode ? { preview: true } : {}),
            },
          })
        }
        onPrevious={goPrevious}
        onNext={() => void goNext()}
        nextPending={toggle.isPending || planQuery.isPending}
        blockedOnTrainer={blockedOnTrainer}
        onEndOfDayHome={() => void navigate({ to: "/" })}
        stepTitleAction={
          canEditDirect ? (
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
                    Saves straight to this step, with the previous version logged.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-6">
                  <StepEditPanel
                    key={active.id}
                    step={active}
                    stepModule={mod}
                    canEditDirect={canEditDirect}
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
        onSignOff={(notes, checklistConfirmed) =>
          signOff.mutate({ stepId: active.id, notes, checklistConfirmed })
        }
        subjectDepartment={subjectDepartment}
        initialedBy={previewMode ? null : (activeRecord?.signed_off_by ?? null)}
        initialedAt={previewMode ? null : (activeRecord?.signed_off_at ?? null)}
        loggingInitials={logInitials.isPending}
        onLogInitials={
          !previewMode && isAdmin && subjectId ? () => logInitials.mutate(active.id) : undefined
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {employee && !canEditDirect ? (
                <SuggestChangeButton stepId={active.id} stepTitle={active.title} moduleId={mod.id} />
              ) : null}
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
        }
      />
    </div>
  );
}

// Real history-back navigation: the module can be reached from Today, the training
// queue, Assign Training, or search — a fixed destination is always a guess.
function BackLink() {
  const router = useRouter();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-xs text-muted-foreground hover:underline"
      onClick={() => {
        if (router.history.canGoBack()) {
          router.history.back();
        } else {
          void navigate({ to: "/" });
        }
      }}
    >
      ← Back
    </button>
  );
}
