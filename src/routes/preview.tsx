import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepRenderer } from "@/components/training/StepRenderer";
import { ModuleHeader } from "@/components/training/ModuleHeader";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { previewTrackQueryOptions, previewTracksQueryOptions } from "@/lib/preview.queries";
import { stepTypeLabels } from "@/lib/training.queries";

const title = "Preview training — Biggers Training Platform";
const description =
  "Managers and owners can browse any training track exactly as a trainee sees it, read-only.";

export const Route = createFileRoute("/preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    track: typeof search["track"] === "string" ? search["track"] : undefined,
    module: typeof search["module"] === "string" ? search["module"] : undefined,
    step: typeof search["step"] === "string" ? search["step"] : undefined,
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

function PreviewPage() {
  const { track: trackId, module: moduleId, step: stepId } = Route.useSearch();
  const { isManagerOrOwner, loading, session } = useAuth();

  const tracksQuery = useQuery(previewTracksQueryOptions());
  const trackQuery = useQuery(previewTrackQueryOptions(trackId));

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isManagerOrOwner) {
    return <p className="text-sm text-muted-foreground">Preview mode is for managers and owners.</p>;
  }

  const tracks = tracksQuery.data ?? [];
  const activeTrack = tracks.find((t) => t.id === trackId);
  const modules = trackQuery.data?.modules ?? [];
  const quizzes = trackQuery.data?.quizzes ?? [];
  const activeModule = modules.find((m) => m.id === moduleId) ?? modules[0];
  const activeStep = activeModule?.steps.find((s) => s.id === stepId) ?? activeModule?.steps[0];

  // One flat walk through the whole track, so Previous/Next crosses module boundaries.
  const flatSteps = modules.flatMap((m) => m.steps.map((s) => ({ moduleId: m.id, stepId: s.id })));
  const activeIndex = activeStep ? flatSteps.findIndex((s) => s.stepId === activeStep.id) : -1;
  const prevStep = activeIndex > 0 ? flatSteps[activeIndex - 1] : undefined;
  const nextStep = activeIndex >= 0 ? flatSteps[activeIndex + 1] : undefined;

  const days: Array<{ key: string; label: string; moduleId: string; day: number | null }> = [];
  for (const m of modules) {
    const key = m.day_assignment === null ? "unassigned" : String(m.day_assignment);
    if (days.some((d) => d.key === key)) continue;
    days.push({
      key,
      label: m.day_assignment === null ? "Unassigned" : `Day ${m.day_assignment}`,
      moduleId: m.id,
      day: m.day_assignment,
    });
  }
  days.sort((a, b) => (a.day ?? 999) - (b.day ?? 999));
  const activeDayKey =
    activeModule?.day_assignment === null || activeModule?.day_assignment === undefined
      ? "unassigned"
      : String(activeModule.day_assignment);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tracks.map((t) => (
          <Link
            key={t.id}
            to="/preview"
            search={{ track: t.id, module: undefined, step: undefined }}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              t.id === trackId
                ? "border-primary bg-primary/10 font-semibold text-foreground"
                : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {trackId && days.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jump to
          </span>
          {days.map((d) => (
            <Link
              key={d.key}
              to="/preview"
              search={{ track: trackId, module: d.moduleId, step: undefined }}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                d.key === activeDayKey
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      ) : null}

      {!trackId ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Pick a track above to start previewing.
          </CardContent>
        </Card>
      ) : null}

      {trackId && trackQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading track…</p>
      ) : null}

      {trackId && !trackQuery.isPending && !modules.length ? (
        <p className="text-sm text-muted-foreground">This track has no live modules yet.</p>
      ) : null}

      {activeModule && activeStep ? (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[248px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {/* Mobile: horizontal scrolling module + step bars */}
            <nav className="md:hidden">
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {modules.map((m) => (
                  <Link
                    key={m.id}
                    to="/preview"
                    search={{ track: trackId, module: m.id, step: undefined }}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                      m.id === activeModule.id
                        ? "border-primary bg-primary/10 font-semibold text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {m.day_assignment ? `Day ${m.day_assignment} · ` : ""}
                    {m.name}
                  </Link>
                ))}
              </div>
            </nav>

            <nav className="hidden space-y-1 rounded-lg border border-border bg-surface/60 p-2 md:block">
              {modules.map((m) => (
                <div key={m.id}>
                  <Link
                    to="/preview"
                    search={{ track: trackId, module: m.id, step: undefined }}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                      m.id === activeModule.id
                        ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-primary/25"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {m.day_assignment ? `Day ${m.day_assignment} · ` : ""}
                      {m.name}
                    </span>
                  </Link>
                  {m.id === activeModule.id ? (
                    <div className="mt-0.5 space-y-0.5 pl-3">
                      {m.steps.map((s) => (
                        <Link
                          key={s.id}
                          to="/preview"
                          search={{ track: trackId, module: m.id, step: s.id }}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[13px] transition-colors ${
                            s.id === activeStep.id
                              ? "bg-secondary font-semibold text-secondary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="shrink-0">{s.sequence_order}.</span>
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <StepStatusBadge status={s.content_status} />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <ModuleHeader
                  as="h2"
                  variant="compact"
                  trackName={activeTrack?.name}
                  subPath={activeModule.sub_path}
                  dayAssignment={activeModule.day_assignment}
                  name={activeModule.name}
                />
              </div>
              <p className="shrink-0 text-xs font-medium text-muted-foreground">
                Step {activeModule.steps.findIndex((s) => s.id === activeStep.id) + 1} of{" "}
                {activeModule.steps.length}
              </p>
            </div>
            <StepRenderer
              step={activeStep}
              quizzes={quizzes.filter((q) => q.step_id === activeStep.id)}
              isAdmin
            />
            <div className="space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={!prevStep}
                  asChild={Boolean(prevStep)}
                >
                  {prevStep ? (
                    <Link
                      to="/preview"
                      search={{ track: trackId, module: prevStep.moduleId, step: prevStep.stepId }}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ChevronLeft className="size-4" aria-hidden />
                      Previous
                    </span>
                  )}
                </Button>
                <Button className="h-11 w-full" disabled={!nextStep} asChild={Boolean(nextStep)}>
                  {nextStep ? (
                    <Link
                      to="/preview"
                      search={{ track: trackId, module: nextStep.moduleId, step: nextStep.stepId }}
                    >
                      Next
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">Finish</span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {stepTypeLabels[activeStep.step_type]}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
