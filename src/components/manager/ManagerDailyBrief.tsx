import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Plus, StickyNote, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, type Employee } from "@/hooks/useAuth";
import {
  createManagerNote,
  deleteManagerNote,
  huddleDepartmentForPath,
  huddleRunsToday,
  todaysHuddleCardQueryOptions,
  todaysManagerNotesQueryOptions,
} from "@/lib/huddle.queries";
import { trainingQueueQueryOptions } from "@/lib/queue.queries";
import { openIssuesForEmployeeQueryOptions } from "@/lib/delivery.queries";

const MOTTO =
  "We are hosts. Every guest who walks in is someone we're welcoming into our home, not a transaction to get through. Southern hospitality means they leave feeling looked after, at ease, and glad they came by.";

/** Pulls a leading "(context)" out of the standard so it reads as a tag, not prose. */
function splitContext(text: string): { context: string | null; body: string } {
  const match = text.match(/^\(([^)]+)\)\s*/);
  if (!match) return { context: null, body: text };
  return { context: match[1] ?? null, body: text.slice(match[0].length) };
}

/** Leadership frame so the huddle gets led, not just read aloud. */
const DRIVE_IT_HOME = [
  "Say why it matters here: name what the guest actually feels when we get this right, and what they feel when we miss it.",
  "Ask one person to say it back in their own words. If they can't, it won't happen on the floor today.",
  "Close the loop before they clock out: one specific person, one specific moment, out loud.",
];

export function ManagerDailyBrief({ employee }: { employee: Employee }) {
  const { isOwner, isManagerOrOwner } = useAuth();
  const department = huddleDepartmentForPath(employee.path);
  const locationId = employee.location_id ?? null;

  const huddleQuery = useQuery(todaysHuddleCardQueryOptions(department));
  const notesQuery = useQuery(todaysManagerNotesQueryOptions(department, locationId));
  const queueQuery = useQuery({
    ...trainingQueueQueryOptions({
      department: employee.department_scope ?? null,
      isOwner,
      locationId,
    }),
  });
  const issuesQuery = useQuery(openIssuesForEmployeeQueryOptions(employee.id));

  const card = huddleQuery.data;
  const notes = notesQuery.data ?? [];
  const signoffs = (queueQuery.data ?? []).filter((entry) => entry.needsTrainer && entry.step);
  const issues = issuesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <p className="max-w-3xl font-display text-[15px] italic leading-relaxed text-muted-foreground">
        {MOTTO}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/40 bg-linear-to-br from-primary/12 via-card to-accent/10">
          <CardContent className="space-y-3 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Huddle of the day{card?.category ? ` · ${card.category}` : ""}
            </p>
            {huddleQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading today&apos;s huddle…</p>
            ) : card ? (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Standard
                  </p>
                  {splitContext(card.standard_text).context ? (
                    <span className="mb-1 inline-block rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {splitContext(card.standard_text).context}
                    </span>
                  ) : null}
                  <p className="font-display text-lg font-semibold leading-snug">
                    {splitContext(card.standard_text).body}
                  </p>
                </div>
                <div className="rounded-md border border-accent/40 bg-accent/8 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Tell the team what you&apos;ll be watching for
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">
                    Say it out loud, word for word: &ldquo;Today I&apos;m watching for{" "}
                    {lowerFirst(splitContext(card.standard_text).body).replace(/\.$/, "")} — and
                    I&apos;ll call out by name whoever I catch doing it.&rdquo;
                  </p>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    How to run this &amp; drive it home
                    <ChevronDown className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <p className="rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm leading-relaxed">
                      {card.manager_tip}
                    </p>
                    <ul className="list-disc space-y-1 rounded-md border border-border/70 bg-card/70 px-3 py-2 pl-7 text-sm leading-relaxed">
                      {DRIVE_IT_HOME.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : department === "kitchen" && !huddleRunsToday("kitchen") ? (
              <p className="text-sm text-muted-foreground">
                No kitchen huddle today — kitchen huddles run Friday, Saturday, and Sunday.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No huddle cards are set up for {department} yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <Collapsible defaultOpen>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-2">
                <CollapsibleTrigger className="group flex flex-1 items-center gap-2 text-left">
                  <StickyNote className="size-4 text-accent" />
                  <span className="font-display text-sm font-semibold">
                    Today&apos;s manager notes
                  </span>
                  <span className="text-xs text-muted-foreground">({notes.length})</span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                </CollapsibleTrigger>
                <AddNoteDialog department={department} locationId={locationId} employeeId={employee.id} isOwner={isOwner} />
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {notesQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">Loading notes…</p>
                ) : notes.length ? (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm leading-relaxed"
                      >
                        <span className="min-w-0 flex-1">{note.note_text}</span>
                        {isManagerOrOwner ? (
                          <DeleteNoteButton noteId={note.id} employeeId={employee.id} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                    No notes for today yet.
                  </p>
                )}
              </CollapsibleContent>
            </CardContent>
          </Collapsible>
        </Card>
      </div>

      {signoffs.length || issues.length ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Assigned to you
          </h2>

          {issues.map((issue) => (
            <Card key={issue.id} className="border-destructive/50 bg-destructive/8">
              <CardContent className="flex flex-wrap items-start gap-3 py-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-destructive">
                    Delivery issue · {issue.product_vendor}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed">{issue.issue_description}</p>
                  {issue.reporter || issue.truck_date ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {issue.reporter
                        ? `Reported by ${issue.reporter.full_name ?? issue.reporter.email}`
                        : null}
                      {issue.reporter && issue.truck_date ? " · " : null}
                      {issue.truck_date ? `Truck date ${issue.truck_date}` : null}
                    </p>
                  ) : null}
                </div>
                <Button asChild size="sm" variant="destructive">
                  <Link to="/reference/sourcing">Review</Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {signoffs.map((entry) => (
            <Card key={entry.employee.id} className="bg-card/70">
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {entry.employee.full_name ?? entry.employee.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Waiting on sign-off · {entry.step?.title}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/training-queue">Open queue</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function DeleteNoteButton({ noteId, employeeId }: { noteId: string; employeeId: string }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteManagerNote({ id: noteId, deletedBy: employeeId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manager-notes"] });
      toast.success("Note removed");
    },
    onError: (error: Error) => toast.error("Couldn't remove note", { description: error.message }),
  });

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label="Delete note"
      disabled={remove.isPending}
      onClick={() => {
        if (window.confirm("Remove this note for today?")) remove.mutate();
      }}
    >
      <X className="size-3.5" />
    </Button>
  );
}

function AddNoteDialog({
  department,
  locationId,
  employeeId,
  isOwner,
}: {
  department: "market" | "kitchen";
  locationId: string | null;
  employeeId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [universal, setUniversal] = useState(false);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      createManagerNote({
        noteText: text.trim(),
        departments: isOwner && universal ? [] : [department],
        locationTag: locationId,
        createdBy: employeeId,
      }),
    onSuccess: () => {
      setText("");
      setUniversal(false);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["manager-notes"] });
      toast.success("Note added for today");
    },
    onError: (error: Error) => toast.error("Couldn't add note", { description: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0">
          <Plus className="size-4" /> Add note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a note for today</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What does the team need to know today?"
          rows={4}
        />
        {isOwner ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={universal}
              onChange={(event) => setUniversal(event.target.checked)}
            />
            Post to every department
          </label>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={!text.trim() || save.isPending}
            className="w-full sm:w-auto"
          >
            {save.isPending ? "Saving…" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
