import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { StepTypeChip } from "@/components/training/StepTypeChip";
import { trainerSignoffTypes, type QuizRow, type StepRow } from "@/lib/training.queries";

/** The minimum a module needs to look like for the trainee walk. */
export type WalkModuleLike = {
  id: string;
  name: string;
  day_assignment: number | null;
  steps: StepRow[];
};

export type WalkEntry<M extends WalkModuleLike> = { module: M; step: StepRow };

type Props<M extends WalkModuleLike> = {
  /** The whole ordered plan walk (already day-grouped). */
  walk: WalkEntry<M>[];
  activeModule: M;
  activeStep: StepRow | undefined;
  isStepDone: (stepId: string) => boolean;
  /** Admins/preview bypass the completion gate entirely. */
  allowFreeNav: boolean;
  onNavigate: (moduleId: string, stepId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  nextPending?: boolean;
  blockedOnTrainer?: boolean;
  /** Rendered instead of the trainee nav column (e.g. preview's reorder tree). */
  sidebar?: ReactNode;
  /** Rendered above the step content (module header, sticky bars, etc.). */
  contentHeader?: ReactNode;
  /** Small badge next to a module chip — used to tag merged-in Universal modules. */
  moduleBadge?: (module: M) => ReactNode;
  stepTitleAction?: ReactNode;
  quizzes?: QuizRow[];
  /** Passed straight through to StepRenderer. */
  isAdmin?: boolean;
  signedOff?: boolean;
  canSignOff?: boolean;
  signingOff?: boolean;
  onSignOff?: () => void;
  initialedBy?: string | null | undefined;
  initialedAt?: string | null | undefined;
  loggingInitials?: boolean;
  onLogInitials?: (() => void) | undefined;
  /** Extra controls under the Previous/Next row (flag, undo, step type label). */
  footer?: ReactNode;
  /** Where the end-of-day card sends the trainee. */
  onEndOfDayHome?: () => void;
};

const chipRow =
  "flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0";

export function TraineeWalk<M extends WalkModuleLike>({
  walk,
  activeModule,
  activeStep,
  isStepDone,
  allowFreeNav,
  onNavigate,
  onPrevious,
  onNext,
  nextPending = false,
  blockedOnTrainer = false,
  sidebar,
  contentHeader,
  moduleBadge,
  stepTitleAction,
  quizzes = [],
  isAdmin = false,
  signedOff = false,
  canSignOff = false,
  signingOff = false,
  onSignOff,
  initialedBy,
  initialedAt,
  loggingInitials = false,
  onLogInitials,
  footer,
  onEndOfDayHome,
}: Props<M>) {
  const activeIndex = activeStep ? walk.findIndex((w) => w.step.id === activeStep.id) : -1;
  const prevEntry = activeIndex > 0 ? walk[activeIndex - 1] : undefined;
  const nextEntry = activeIndex >= 0 ? walk[activeIndex + 1] : undefined;
  const isLastStep = activeIndex >= 0 && !nextEntry;

  const activeDay = activeModule.day_assignment ?? 99;
  const isEndOfDay = Boolean(nextEntry) && (nextEntry!.module.day_assignment ?? 99) !== activeDay;

  // Furthest reached: every completed step, plus the one right after it.
  const lastDoneIndex = walk.reduce((acc, entry, i) => (isStepDone(entry.step.id) ? i : acc), -1);
  const maxReachable = allowFreeNav ? walk.length - 1 : lastDoneIndex + 1;
  const indexOfStep = (stepId: string) => walk.findIndex((w) => w.step.id === stepId);
  const isReachable = (stepId: string) => {
    const i = indexOfStep(stepId);
    if (i === -1) return allowFreeNav;
    return i <= maxReachable;
  };

  // Today's modules, in walk order, de-duplicated.
  const dayEntries = walk.filter((w) => (w.module.day_assignment ?? 99) === activeDay);
  const dayModules: M[] = [];
  for (const entry of dayEntries) {
    if (!dayModules.some((m) => m.id === entry.module.id)) dayModules.push(entry.module);
  }
  const dayDone = dayEntries.filter((e) => isStepDone(e.step.id)).length;
  const dayPct = Math.round((dayDone / Math.max(dayEntries.length, 1)) * 100);

  const moduleTarget = (m: M) => m.steps.find((s) => !isStepDone(s.id)) ?? m.steps[0];

  const needsTrainer = activeStep ? trainerSignoffTypes.includes(activeStep.step_type) : false;
  const dayHasTrainerStep = dayEntries.some((e) => trainerSignoffTypes.includes(e.step.step_type));
  const showTrainerFollowUp = !needsTrainer && dayHasTrainerStep;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[248px_minmax(0,1fr)] md:items-start">
      {sidebar ?? (
        <div className="min-w-0 space-y-3 self-start md:sticky md:top-24">
          {dayModules.length ? (
            <div className="min-w-0">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Today&apos;s modules
              </p>
              <div
                className={`${chipRow} md:rounded-lg md:border md:border-border md:bg-surface/60 md:p-2`}
              >
                {dayModules.map((m) => {
                  const target = moduleTarget(m);
                  const doneModule = m.steps.length > 0 && m.steps.every((s) => isStepDone(s.id));
                  const isActiveModule = m.id === activeModule.id;
                  const locked =
                    !isActiveModule && !(target ? isReachable(target.id) : allowFreeNav);
                  const base =
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs md:w-full md:shrink md:whitespace-normal md:border-0 md:text-sm";
                  const icon = doneModule ? (
                    <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                  ) : locked ? (
                    <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                  ) : null;

                  if (locked) {
                    return (
                      <span
                        key={m.id}
                        aria-disabled="true"
                        className={`${base} cursor-default border-border text-muted-foreground opacity-55`}
                      >
                        {icon}
                        <span className="min-w-0 md:truncate">{m.name}</span>
                        {moduleBadge?.(m)}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => target && onNavigate(m.id, target.id)}
                      className={`${base} text-left transition-colors ${
                        isActiveModule
                          ? "border-primary/40 bg-card font-semibold text-foreground ring-1 ring-primary/25"
                          : "border-border text-muted-foreground hover:bg-card/70 hover:text-foreground"
                      }`}
                    >
                      {icon}
                      <span className="min-w-0 md:truncate">{m.name}</span>
                      {moduleBadge?.(m)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-valuenow={dayPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Today's progress"
                >
                  <span
                    className="block h-full rounded-full bg-accent-bright transition-[width]"
                    style={{ width: `${dayPct}%` }}
                  />
                </div>
                <p className="shrink-0 text-xs font-medium text-muted-foreground">
                  {dayDone} of {dayEntries.length} steps today
                </p>
              </div>
            </div>
          ) : null}

          {/* Steps inside the open module — nested under the modules tier. */}
          <div className="min-w-0 md:pl-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              Steps in this module
            </p>
            <div className={`${chipRow} md:rounded-lg md:bg-secondary/40 md:p-1.5`}>
              {activeModule.steps.map((s, i) => {
                const isActive = s.id === activeStep?.id;
                const locked = !isActive && !isReachable(s.id);
                const base =
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] md:w-full md:shrink md:items-start md:whitespace-normal md:px-2.5 md:py-1.5 md:text-[13px]";
                const label = (
                  <>
                    <span className="shrink-0 tabular-nums">{i + 1}.</span>
                    {isStepDone(s.id) ? (
                      <Check className="size-3 shrink-0 text-success" aria-hidden />
                    ) : locked ? (
                      <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                    <span className="min-w-0 md:flex-1">
                      <span className="block md:truncate">{s.title}</span>
                      <span className="mt-1 hidden md:block">
                        <StepTypeChip type={s.step_type} />
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <StepStatusBadge status={s.content_status} />
                    </span>
                  </>
                );

                if (locked) {
                  return (
                    <span
                      key={s.id}
                      aria-disabled="true"
                      className={`${base} cursor-default text-muted-foreground opacity-55`}
                    >
                      {label}
                    </span>
                  );
                }
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onNavigate(activeModule.id, s.id)}
                    className={`${base} text-left transition-colors ${
                      isActive
                        ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-primary/25"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0 space-y-6">
        {contentHeader}

        {activeStep ? (
          <StepRenderer
            step={activeStep}
            titleAs="h1"
            titleAction={stepTitleAction}
            quizzes={quizzes}
            isAdmin={isAdmin}
            signedOff={signedOff}
            canSignOff={canSignOff}
            signingOff={signingOff}
            {...(onSignOff ? { onSignOff } : {})}
            initialedBy={initialedBy}
            initialedAt={initialedAt}
            loggingInitials={loggingInitials}
            onLogInitials={onLogInitials}
          />
        ) : (
          <p className="text-sm text-muted-foreground">This module has no steps yet.</p>
        )}

        {showTrainerFollowUp ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" aria-hidden="true" />
            Your trainer will also walk through this with you in person later today.
          </p>
        ) : null}

        <div className="space-y-3 border-t border-border pt-4">
          {isEndOfDay ? (
            <div className="rounded-xl border-2 border-accent/50 bg-accent/10 px-5 py-5 text-center">
              <p className="font-display text-lg font-semibold text-foreground">
                You&apos;ve finished today&apos;s material
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Find your manager or trainer to continue.
              </p>
              {onEndOfDayHome ? (
                <Button className="mt-4 h-11" onClick={onEndOfDayHome}>
                  Back to home
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className={`grid gap-3 ${isEndOfDay ? "grid-cols-1" : "grid-cols-2"}`}>
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={!prevEntry}
              onClick={onPrevious}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            {isEndOfDay ? null : (
              <Button
                className="h-11 w-full"
                disabled={blockedOnTrainer || nextPending}
                onClick={onNext}
              >
                {blockedOnTrainer ? "Waiting on your trainer" : isLastStep ? "Finish" : "Next"}
                {blockedOnTrainer ? null : <ChevronRight className="size-4" aria-hidden />}
              </Button>
            )}
          </div>

          {footer}
        </div>
      </div>
    </div>
  );
}
