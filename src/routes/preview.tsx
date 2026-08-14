import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Film, Pencil, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  NewModuleDialog,
  NewStepDialog,
  NewTrackDialog,
} from "@/components/admin/ContentCreateDialogs";
import { SortableContentTree } from "@/components/admin/SortableContentTree";
import { ModuleEditPanel, StepEditPanel } from "@/components/admin/EntityEditPanels";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import { TraineeWalk } from "@/components/training/TraineeWalk";
import { ModuleThemeCard } from "@/components/training/ModuleThemeCard";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { StepTypeChip } from "@/components/training/StepTypeChip";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { contentTreeQueryOptions } from "@/lib/admin.queries";
import {
  branchOptionsQueryOptions,
  getDayGroupedSteps,
  moduleVisibleForSubPath,
  stepTypeLabels,
} from "@/lib/training.queries";
import type { QuizRow, StepRow } from "@/lib/training.queries";

const title = "Preview training — Biggers Training Platform";
const description =
  "Managers and owners browse any training track exactly as a trainee sees it, and edit it in place.";

export const Route = createFileRoute("/preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    track: typeof search["track"] === "string" ? search["track"] : undefined,
    module: typeof search["module"] === "string" ? search["module"] : undefined,
    step: typeof search["step"] === "string" ? search["step"] : undefined,
    branch: typeof search["branch"] === "string" ? search["branch"] : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreviewPage,
});

/** A curation flag only: the step asks for media it doesn't have yet. */
function unmetMediaRecommendation(s: {
  media_recommendation?: "none" | "photo" | "video" | null;
  media_url?: string | null;
  video_url?: string | null;
}) {
  if (s.media_recommendation === "photo" && !s.media_url) return "photo" as const;
  if (s.media_recommendation === "video" && !s.video_url) return "video" as const;
  return null;
}

function PreviewPage() {
  const { track: trackId, module: moduleId, step: stepId, branch } = Route.useSearch();
  const navigate = useNavigate({ from: "/preview" });
  const { isManagerOrOwner, isOwner, isGeneralManager, employee, loading, session } = useAuth();
  const queryClient = useQueryClient();
  const [stepSheetOpen, setStepSheetOpen] = useState(false);
  const [moduleSheetOpen, setModuleSheetOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [manageMode, setManageMode] = useState(false);

  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const allTracks = treeQuery.data?.tracks ?? [];
  const allModules = treeQuery.data?.modules ?? [];
  const allSteps = treeQuery.data?.steps ?? [];

  // Resolve the active trio from the URL, walking up the flat arrays.
  const urlStep = allSteps.find((s) => s.id === stepId);
  const urlModule = allModules.find((m) => m.id === (urlStep?.module_id ?? moduleId));
  const activeTrack = allTracks.find((t) => t.id === (trackId ?? urlModule?.track_id)) ?? undefined;

  const buildModules = (predicate: (m: (typeof allModules)[number]) => boolean, shared: boolean) =>
    allModules
      .filter((m) => predicate(m) && (showHidden || !m.is_deleted))
      .map((m) => ({
        ...m,
        isShared: shared,
        steps: allSteps
          .filter((s) => s.module_id === m.id && (showHidden || !s.is_deleted))
          .sort((a, b) => a.sequence_order - b.sequence_order),
      }));

  const ownModulesAll = activeTrack
    ? buildModules((m) => m.track_id === activeTrack.id, false)
    : [];
  const branchOptionsQuery = useQuery({
    ...branchOptionsQueryOptions(activeTrack?.department ?? null),
    enabled: isManagerOrOwner && !!activeTrack?.department,
  });
  const branchOptions = branchOptionsQuery.data ?? [];
  // A branching track always previews as one specific branch — never unfiltered.
  const effectiveBranch =
    branchOptions.length > 1
      ? branch && branchOptions.includes(branch)
        ? branch
        : branchOptions[0]
      : undefined;
  // Branch filter: narrow the division's own modules to one branch; shared/Universal never filter.
  const ownModules = effectiveBranch
    ? ownModulesAll.filter((m) => moduleVisibleForSubPath(m, effectiveBranch))
    : ownModulesAll;
  // A trainee always gets Universal alongside their own division, so preview it that way too.
  const universalTrackIds = allTracks.filter((t) => t.department === "universal").map((t) => t.id);
  const isUniversalTrack = activeTrack?.department === "universal";
  const dayKeys = new Set(ownModules.map((m) => m.day_assignment ?? 99));
  const sharedModules =
    activeTrack && !isUniversalTrack
      ? buildModules(
          (m) => universalTrackIds.includes(m.track_id) && dayKeys.has(m.day_assignment ?? 99),
          true,
        )
      : [];

  const trackModules = [...sharedModules, ...ownModules].sort(
    (a, b) =>
      (a.day_assignment ?? 99) - (b.day_assignment ?? 99) ||
      Number(b.isShared) - Number(a.isShared) ||
      a.sequence_order - b.sequence_order,
  );

  // Trainee-order flat walk: day groups, in start / middle / end day-position order.
  const walk = getDayGroupedSteps(trackModules);
  const activeModule = trackModules.find((m) => m.id === urlModule?.id) ?? trackModules[0];
  const activeStep: StepRow | undefined =
    urlStep ??
    (activeModule
      ? (walk.find((w) => w.module.id === activeModule.id)?.step ?? activeModule.steps[0])
      : undefined);

  const quizzesQuery = useQuery({
    queryKey: ["preview-step-quizzes", activeStep?.id],
    enabled: Boolean(activeStep?.id) && activeStep?.step_type === "quiz",
    queryFn: async (): Promise<QuizRow[]> => {
      const { data, error } = await supabase
        .from("quiz_bank")
        .select("*")
        .eq("step_id", activeStep!.id)
        .eq("is_deleted", false)
        .order("sequence_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const inDivision = activeTrack?.department === employee?.department_scope;
  const canEditDirect = isOwner || (isGeneralManager && inDivision);
  const canSuggest = isManagerOrOwner && !canEditDirect && inDivision;
  const refreshPreview = () => {
    void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
  };

  // Create-authority (any manager in their own division) — RLS enforces it too.
  const canEditDepartment = (department: string | null | undefined) =>
    employee?.auth_tier === "owner" ||
    (employee?.auth_tier === "manager" && !!department && department === employee.department_scope);
  const canCreateTrack = employee?.auth_tier === "owner" || employee?.auth_tier === "manager";
  const canReorderTracks = isOwner || isGeneralManager;
  const canReorderModulesIn = (track: { department: string | null }) =>
    isOwner || isGeneralManager || canEditDepartment(track.department);

  const selection: { kind: "step" | "module" | "track"; id: string } = urlStep
    ? { kind: "step", id: urlStep.id }
    : moduleId && urlModule
      ? { kind: "module", id: urlModule.id }
      : { kind: "track", id: trackId ?? "" };

  const select = (next: { kind: "step" | "module" | "track"; id: string }) => {
    if (next.kind === "track") {
      void navigate({ search: { track: next.id, module: undefined, step: undefined, branch: undefined } });
      return;
    }
    if (next.kind === "module") {
      const m = allModules.find((x) => x.id === next.id);
      void navigate({ search: { track: m?.track_id, module: next.id, step: undefined, branch: effectiveBranch } });
      return;
    }
    const s = allSteps.find((x) => x.id === next.id);
    const m = allModules.find((x) => x.id === s?.module_id);
    void navigate({ search: { track: m?.track_id, module: m?.id, step: next.id, branch: effectiveBranch } });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isManagerOrOwner) {
    return (
      <p className="text-sm text-muted-foreground">Preview mode is for managers and owners.</p>
    );
  }

  const activeIndex = activeStep ? walk.findIndex((w) => w.step.id === activeStep.id) : -1;
  const prevStep = activeIndex > 0 ? walk[activeIndex - 1] : undefined;
  const nextStep = activeIndex >= 0 ? walk[activeIndex + 1] : undefined;

  const days: Array<{ key: string; label: string; moduleId: string; day: number | null }> = [];
  for (const m of trackModules) {
    const key = m.day_assignment === null ? "unassigned" : String(m.day_assignment);
    if (days.some((d) => d.key === key)) continue;
    days.push({
      key,
      label: m.day_assignment === null ? "Unassigned" : `Day ${m.day_assignment}`,
      moduleId: m.id,
      day: m.day_assignment,
    });
  }
  const activeDayKey =
    activeModule?.day_assignment === null || activeModule?.day_assignment === undefined
      ? "unassigned"
      : String(activeModule.day_assignment);

  const visibleTracks = allTracks.filter((t) => !t.is_deleted);

  if (!activeTrack) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        {treeQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading content…</p>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Preview training</h1>
              <p className="text-sm text-muted-foreground">
                Choose a division to see it exactly as a new hire would.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {visibleTracks.map((t) => (
                <Link
                  key={t.id}
                  to="/preview"
                  search={{ track: t.id, module: undefined, step: undefined, branch: undefined }}
                  className="rounded-lg border-2 border-border px-6 py-4 text-base font-semibold transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {visibleTracks.map((t) => (
          <Link
            key={t.id}
            to="/preview"
            search={{ track: t.id, module: undefined, step: undefined, branch: undefined }}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              t.id === activeTrack.id
                ? "border-primary bg-primary/10 font-semibold text-foreground"
                : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {branchOptions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Branch
          </span>
          {branchOptions.map((b) => (
            <Link
              key={b}
              to="/preview"
              search={{ track: activeTrack.id, module: undefined, step: undefined, branch: b }}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                effectiveBranch === b
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {b}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {days.length > 1 ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Jump to
            </span>
            {days.map((d) => (
              <Link
                key={d.key}
                to="/preview"
                search={{ track: activeTrack.id, module: d.moduleId, step: undefined, branch: effectiveBranch }}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  d.key === activeDayKey
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {d.label}
              </Link>
            ))}
          </>
        ) : null}
        {canEditDirect || canSuggest ? (
          <Button
            type="button"
            size="sm"
            variant={manageMode ? "secondary" : "outline"}
            aria-pressed={manageMode}
            className={`ml-auto ${manageMode ? "ring-1 ring-primary/40" : ""}`}
            onClick={() => setManageMode((v) => !v)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Manage content
          </Button>
        ) : null}
      </div>

      {!treeQuery.isPending && !trackModules.length ? (
        <p className="text-sm text-muted-foreground">This track has no live modules yet.</p>
      ) : null}

      {activeModule && activeStep ? (
        <TraineeWalk
          walk={walk}
          activeModule={activeModule}
          activeStep={activeStep}
          isStepDone={() => false}
          allowFreeNav
          onNavigate={(targetModuleId: string, targetStepId: string) =>
            void navigate({
              search: {
                track: activeTrack.id,
                module: targetModuleId,
                step: targetStepId,
                branch: effectiveBranch,
              },
            })
          }
          onPrevious={() =>
            prevStep
              ? void navigate({
                  search: {
                    track: activeTrack.id,
                    module: prevStep.module.id,
                    step: prevStep.step.id,
                    branch: effectiveBranch,
                  },
                })
              : undefined
          }
          onNext={() =>
            nextStep
              ? void navigate({
                  search: {
                    track: activeTrack.id,
                    module: nextStep.module.id,
                    step: nextStep.step.id,
                    branch: effectiveBranch,
                  },
                })
              : undefined
          }
          quizzes={quizzesQuery.data ?? []}
          isAdmin
          moduleBadge={(m: (typeof trackModules)[number]) =>
            m.isShared ? (
              <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                Shared
              </span>
            ) : null
          }
          sidebar={
            manageMode ? (
              <nav className="min-w-0 space-y-4 overflow-x-auto md:sticky md:top-24 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:pr-1">
                <NewTrackDialog disabled={!canCreateTrack} onCreated={() => undefined} />
                <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                  <Label
                    htmlFor="show-hidden"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Show hidden
                  </Label>
                  <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
                </div>
                <SortableContentTree
                  tracks={allTracks.filter((t) => showHidden || !t.is_deleted)}
                  modules={allModules.filter((m) => showHidden || !m.is_deleted)}
                  steps={allSteps.filter((s) => showHidden || !s.is_deleted)}
                  selection={selection}
                  onSelect={select}
                  canReorderTracks={canReorderTracks}
                  canReorderModulesIn={canReorderModulesIn}
                  renderTrackLabel={(track) => (
                    <span className={track.is_deleted ? "line-through" : undefined}>
                      {track.name}
                    </span>
                  )}
                  renderModuleLabel={(m) => (
                    <>
                      <span className={m.is_deleted ? "line-through" : undefined}>{m.name}</span>
                      {m.is_deleted ? " (hidden)" : ""}
                    </>
                  )}
                  renderTrackFooter={(track) => (
                    <NewModuleDialog
                      trackId={track.id}
                      nextSequence={allModules.filter((m) => m.track_id === track.id).length + 1}
                      disabled={!canEditDepartment(track.department)}
                      onCreated={() => undefined}
                    />
                  )}
                  renderStepLabel={(s) => (
                    <span className="flex items-center gap-1.5">
                      <span className={s.is_deleted ? "line-through" : undefined}>{s.title}</span>
                      {unmetMediaRecommendation(s) === "photo" ? (
                        <Camera
                          className="size-3.5 shrink-0 text-warning"
                          aria-label="Photo recommended, not added yet"
                        />
                      ) : unmetMediaRecommendation(s) === "video" ? (
                        <Film
                          className="size-3.5 shrink-0 text-warning"
                          aria-label="Video recommended, not added yet"
                        />
                      ) : null}
                    </span>
                  )}
                  renderModuleChildren={(m, track) => (
                    <NewStepDialog
                      moduleId={m.id}
                      nextSequence={allSteps.filter((s) => s.module_id === m.id).length + 1}
                      disabled={!canEditDepartment(track.department)}
                      onCreated={(id) => select({ kind: "step", id })}
                    />
                  )}
                />
              </nav>
            ) : undefined
          }
          contentHeader={
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <ModuleHeader
                    as="h2"
                    variant="compact"
                    trackName={activeTrack.name}
                    subPath={activeModule.sub_path}
                    dayAssignment={activeModule.day_assignment}
                    name={activeModule.name}
                  />
                  {activeModule.isShared ? (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      Shared with every division
                    </span>
                  ) : null}
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
                            module={activeModule}
                            trackName={activeTrack.name}
                            department={activeTrack.department}
                            canEdit={canEditDirect}
                            employeeId={employee?.id}
                            deleteRequiresApproval={isGeneralManager && !isOwner}
                            onSaved={() => {
                              refreshPreview();
                              setModuleSheetOpen(false);
                            }}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                  ) : null}
                </div>
                <p className="shrink-0 text-xs font-medium text-muted-foreground">
                  Step {activeModule.steps.findIndex((s) => s.id === activeStep.id) + 1} of{" "}
                  {activeModule.steps.length}
                </p>
              </div>
              <ModuleThemeCard
                description={activeModule.description}
                trackName={activeTrack.name}
              />
            </div>
          }
          stepTitleAction={
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
                      key={activeStep.id}
                      step={activeStep}
                      stepModule={{ ...activeModule, track: activeTrack }}
                      canEditDirect={canEditDirect}
                      canSuggest={canSuggest}
                      employeeId={employee?.id}
                      onSaved={() => {
                        refreshPreview();
                        setStepSheetOpen(false);
                      }}
                    />
                    {activeStep.step_type === "quiz" ? (
                      <QuizQuestionsPanel key={`quiz-${activeStep.id}`} stepId={activeStep.id} />
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>
            ) : null
          }
          footer={
            <p className="text-xs text-muted-foreground">{stepTypeLabels[activeStep.step_type]}</p>
          }
        />
      ) : null}
    </div>
  );
}
