import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { trainingQueueQueryOptions, type QueueEntry } from "@/lib/queue.queries";
import { stepTypeLabels } from "@/lib/training.queries";

const title = "Training Queue — Biggers Training Platform";
const description =
  "See where each employee is in training and who is waiting on a trainer sign-off right now.";

export const Route = createFileRoute("/training-queue")({
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
  component: TrainingQueuePage,
});

function name(entry: QueueEntry) {
  return entry.employee.full_name ?? entry.employee.email;
}

function ProgressNote({ entry }: { entry: QueueEntry }) {
  if (!entry.total) return <span className="text-xs text-muted-foreground">No track assigned</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {entry.completed} of {entry.total} steps complete
    </span>
  );
}

function TrainingQueuePage() {
  const { isManagerOrOwner, isOwner, employee, loading, session } = useAuth();
  const queueQuery = useQuery({
    ...trainingQueueQueryOptions({
      department: employee?.department_scope ?? null,
      isOwner,
    }),
    enabled: isManagerOrOwner,
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isManagerOrOwner) {
    return <p className="text-sm text-muted-foreground">The training queue is manager-only.</p>;
  }

  const entries = queueQuery.data ?? [];
  const needsYou = entries.filter((e) => e.needsTrainer);
  const selfPaced = entries.filter((e) => !e.needsTrainer && e.step);
  const finished = entries.filter((e) => !e.step);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Training Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOwner
            ? "Everyone's next step across all departments."
            : "Your department's next steps."}{" "}
          Anyone waiting on a trainer is listed first.
        </p>
      </div>

      {queueQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : null}
      {queueQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load the training queue.</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Needs you{" "}
          <span className="text-sm font-normal text-muted-foreground">({needsYou.length})</span>
        </h2>
        {needsYou.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Nobody is waiting on a trainer right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {needsYou.map((entry) => (
              <li
                key={entry.employee.id}
                className="rounded-lg border-2 border-warning/50 bg-warning-soft/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold tracking-tight">
                      {name(entry)}{" "}
                      <span className="text-warning">— needs you: {entry.step!.title}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.track?.name} · {entry.module?.name}
                      {entry.module?.day_assignment ? ` · Day ${entry.module.day_assignment}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge className="bg-warning text-[11px] font-semibold uppercase tracking-wide text-warning-foreground">
                        {stepTypeLabels[entry.step!.step_type]}
                      </Badge>
                      <StepStatusBadge status={entry.step!.content_status} />
                      <ProgressNote entry={entry} />
                    </div>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/modules/$moduleId" params={{ moduleId: entry.module!.id }}>
                      Open module
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Working on their own{" "}
          <span className="text-sm font-normal text-muted-foreground">({selfPaced.length})</span>
        </h2>
        {selfPaced.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one is mid-track right now.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {selfPaced.map((entry) => (
              <li
                key={entry.employee.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name(entry)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Next: {entry.step!.title} · {entry.module?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {stepTypeLabels[entry.step!.step_type]}
                  </span>
                  <ProgressNote entry={entry} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {finished.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Nothing queued{" "}
            <span className="text-sm font-normal text-muted-foreground">({finished.length})</span>
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {finished.map((entry) => (
              <li
                key={entry.employee.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-sm">{name(entry)}</span>
                <ProgressNote entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
