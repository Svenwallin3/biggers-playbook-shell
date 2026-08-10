import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";

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
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
        <Eye className="size-4 text-warning" />
        <p className="text-sm font-semibold text-warning">Preview as trainee — read-only</p>
        <p className="text-xs text-warning/90">
          Nothing here is saved. No progress, sign-offs, or quiz attempts are recorded.
        </p>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Preview training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse any track the way a new hire meets it — same order, same content states.
        </p>
      </div>

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
        <div className="grid gap-8 md:grid-cols-[248px_1fr]">
          <div className="space-y-4">
            <nav className="space-y-1 rounded-lg border border-border bg-surface/60 p-2">
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
            <p className="px-1 text-xs text-muted-foreground">
              A trainee unlocks these in order — {activeTrack?.department === "universal"
                ? "Hospitality comes first for everyone."
                : "after finishing Universal / Hospitality."}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <ModuleHeader
                as="h2"
                trackName={activeTrack?.name}
                subPath={activeModule.sub_path}
                dayAssignment={activeModule.day_assignment}
                name={activeModule.name}
                description={activeModule.description}
              />
            </div>
            <StepRenderer
              step={activeStep}
              quizzes={quizzes.filter((q) => q.step_id === activeStep.id)}
              isAdmin
            />
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <span>{stepTypeLabels[activeStep.step_type]}</span>
              <span>Preview mode — completion is disabled</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
