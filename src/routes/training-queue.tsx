import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { StickyNote } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { trainingQueueQueryOptions, type QueueEntry } from "@/lib/queue.queries";
import { checklistForDepartment, signOffStep, stepTypeLabels } from "@/lib/training.queries";

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

function HandoffNote({ entry }: { entry: QueueEntry }) {
  const [open, setOpen] = useState(false);
  if (!entry.lastNoteDetail) return null;
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <StickyNote className="size-3.5 shrink-0" aria-hidden="true" />
        Trainer note
      </button>
      {open ? (
        <div className="mt-2 max-w-prose rounded-md border border-border bg-card px-3 py-2 text-xs">
          <p className="font-semibold text-foreground">{entry.lastNoteDetail.label}</p>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">
            {entry.lastNoteDetail.note}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TrainingQueuePage() {
  const { isManagerOrOwner, isOwner, employee, loading, session } = useAuth();
  const queryClient = useQueryClient();
  const queueQuery = useQuery({
    ...trainingQueueQueryOptions({
      department: employee?.department_scope ?? null,
      isOwner,
      locationId: employee?.location_id ?? null,
    }),
    enabled: isManagerOrOwner,
  });

  const [notingId, setNotingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const signOff = useMutation({
    mutationFn: ({
      entry,
      notes,
      checklistConfirmed,
    }: {
      entry: QueueEntry;
      notes?: string | undefined;
      checklistConfirmed?: string[] | undefined;
    }) =>
      signOffStep({
        employeeId: entry.employee.id,
        stepId: entry.step!.id,
        signedOffBy: employee!.id,
        existingId: entry.progressId ?? undefined,
        notes,
        checklistConfirmed,
      }),
    onSuccess: () => {
      setNotingId(null);
      setNoteDraft("");
      setCheckedItems([]);
      toast.success("Signed off");
      void queryClient.invalidateQueries({ queryKey: ["training-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (error: Error) => toast.error("Couldn't sign off", { description: error.message }),
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
          {isOwner ? "Everyone's next step across all divisions." : "Your division's next steps."}{" "}
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
            {needsYou.map((entry) => {
              const checklist = checklistForDepartment(
                entry.step?.signoff_checklist,
                entry.employee.department_scope,
              );
              const checklistComplete = checklist.every((item) => checkedItems.includes(item.text));
              return (
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
                        {entry.module?.day_assignment
                          ? ` · Day ${entry.module.day_assignment}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge className="bg-warning text-[11px] font-semibold uppercase tracking-wide text-warning-foreground">
                          {stepTypeLabels[entry.step!.step_type]}
                        </Badge>
                        <StepStatusBadge status={entry.step!.content_status} />
                        <ProgressNote entry={entry} />
                      </div>
                      <HandoffNote entry={entry} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link
                          to="/modules/$moduleId"
                          params={{ moduleId: entry.module!.id }}
                          search={{ step: entry.step?.id, trainee: entry.employee.id }}
                        >
                          Open module
                        </Link>
                      </Button>
                      {notingId === entry.employee.id ? (
                        <Button
                          size="sm"
                          disabled={signOff.isPending || !checklistComplete}
                          onClick={() =>
                            signOff.mutate({
                              entry,
                              notes: noteDraft,
                              ...(checklist.length ? { checklistConfirmed: checkedItems } : {}),
                            })
                          }
                        >
                          {signOff.isPending ? "Signing off…" : "Confirm sign-off"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setNotingId(entry.employee.id);
                            setNoteDraft("");
                            setCheckedItems([]);
                          }}
                        >
                          Sign off
                        </Button>
                      )}
                    </div>
                  </div>
                  {notingId === entry.employee.id && checklist.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Confirm what you covered
                      </p>
                      <ul className="space-y-2">
                        {checklist.map((item) => (
                          <li key={item.text} className="flex items-start gap-2">
                            <Checkbox
                              id={`queue-item-${entry.employee.id}-${item.text}`}
                              checked={checkedItems.includes(item.text)}
                              onCheckedChange={(v) =>
                                setCheckedItems((prev) =>
                                  v === true
                                    ? [...prev, item.text]
                                    : prev.filter((t) => t !== item.text),
                                )
                              }
                            />
                            <label
                              htmlFor={`queue-item-${entry.employee.id}-${item.text}`}
                              className="text-sm leading-snug"
                            >
                              {item.text}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {notingId === entry.employee.id ? (
                    <div className="mt-3 space-y-1.5">
                      <label
                        htmlFor={`queue-handoff-${entry.employee.id}`}
                        className="text-xs font-semibold text-foreground"
                      >
                        Notes for the next trainer (optional)
                      </label>
                      <Textarea
                        id={`queue-handoff-${entry.employee.id}`}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={2}
                        placeholder="Anything the next trainer should know…"
                      />
                      <p className="text-xs text-muted-foreground">
                        Only visible to managers. The trainee won&apos;t see this.
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
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
