import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Compass,
  MessageCircleQuestion,
  Plus,
  Search,
  StickyNote,
  Truck,
  Users,
  X,
} from "lucide-react";
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
import { AskAssistant } from "@/components/training/AskAssistant";
import { ReportDeliveryIssueDialog } from "@/components/sourcing/ReportDeliveryIssueDialog";
import { useAuth, type Employee } from "@/hooks/useAuth";
import {
  createManagerNote,
  deleteManagerNote,
  huddleDepartmentForDivision,
  huddleRunsToday,
  todaysHuddleCardQueryOptions,
  todaysManagerNotesQueryOptions,
} from "@/lib/huddle.queries";
import { divisionLabel } from "@/lib/reference.queries";
import { trainingQueueQueryOptions } from "@/lib/queue.queries";
import { openIssuesForEmployeeQueryOptions } from "@/lib/delivery.queries";

/** Pulls a leading "(context)" out of the standard so it reads as a tag, not prose. */
function splitContext(text: string): { context: string | null; body: string } {
  const match = text.match(/^\(([^)]+)\)\s*/);
  if (!match) return { context: null, body: text };
  return { context: match[1] ?? null, body: text.slice(match[0].length) };
}

/** Lowercases the first letter so the standard reads inside a spoken sentence. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Leadership frame so the huddle gets led, not just read aloud. */
const DRIVE_IT_HOME = [
  "Say why it matters here: name what the guest actually feels when we get this right, and what they feel when we miss it.",
  "Ask one person to say it back in their own words. If they can't, it won't happen on the floor today.",
  "Close the loop before they clock out: one specific person, one specific moment, out loud.",
];

/* ------------------------------------------------------------------ */
/* 1. Standard of the day — every signed-in employee                    */
/* ------------------------------------------------------------------ */

export function StandardOfTheDay({ employee }: { employee: Employee }) {
  const { isManagerOrOwner } = useAuth();
  const department = huddleDepartmentForDivision(employee.department_scope);
  const huddleQuery = useQuery(todaysHuddleCardQueryOptions(department));
  const card = huddleQuery.data;

  return (
    <Card className="border-primary/40 bg-linear-to-br from-primary/12 via-card to-accent/10">
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Standard of the day
          </p>
          {card?.category ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {card.category}
            </span>
          ) : null}
        </div>

        {huddleQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading today&apos;s standard…</p>
        ) : card ? (
          <>
            <div>
              {splitContext(card.standard_text).context ? (
                <span className="mb-1 inline-block rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {splitContext(card.standard_text).context}
                </span>
              ) : null}
              <p className="font-display text-lg font-semibold leading-snug">
                {splitContext(card.standard_text).body}
              </p>
              {card.standard_context ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {card.standard_context}
                </p>
              ) : null}
            </div>

            {isManagerOrOwner ? (
              <Collapsible>
                <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-left text-xs font-semibold text-foreground">
                  <span>How to run this &amp; drive it home</span>
                  <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="group-data-[state=open]:hidden">Show</span>
                    <span className="hidden group-data-[state=open]:inline">Hide</span>
                    <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
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
            ) : null}
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
  );
}

/* ------------------------------------------------------------------ */
/* 2. Quick-action row — everyone                                       */
/* ------------------------------------------------------------------ */

const tileClass =
  "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center transition-colors hover:border-primary";

export function QuickActionRow() {
  const [askOpen, setAskOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button type="button" className={tileClass} onClick={() => setAskOpen(true)}>
          <MessageCircleQuestion className="size-5 text-accent" aria-hidden />
          <span className="text-xs font-semibold">Ask</span>
        </button>
        <Link to="/search" className={tileClass}>
          <Search className="size-5 text-primary" aria-hidden />
          <span className="text-xs font-semibold">Search</span>
        </Link>
        <button type="button" className={tileClass} onClick={() => setReportOpen(true)}>
          <Truck className="size-5 text-destructive" aria-hidden />
          <span className="text-xs font-semibold">Report issue</span>
        </button>
      </div>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Just ask</DialogTitle>
          </DialogHeader>
          <AskAssistant />
        </DialogContent>
      </Dialog>

      <ReportDeliveryIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Manager / GM / Owner 2x2 tile grid                                */
/* ------------------------------------------------------------------ */

function TileShell({
  icon,
  count,
  label,
  subtext,
  className,
}: {
  icon: ReactNode;
  count?: number;
  label: string;
  subtext?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[88px] w-full flex-col gap-1 px-3 py-3 text-left ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {typeof count === "number" ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            {count}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold leading-tight">{label}</p>
      {subtext ? (
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{subtext}</p>
      ) : null}
    </div>
  );
}

const gridTileClass =
  "rounded-xl border border-border bg-card transition-colors hover:border-primary";

export function ManagerTileGrid({ employee }: { employee: Employee }) {
  const { isOwner } = useAuth();
  const department = huddleDepartmentForDivision(employee.department_scope);
  const locationId = employee.location_id ?? null;

  const queueQuery = useQuery(
    trainingQueueQueryOptions({
      department: employee.department_scope ?? null,
      isOwner,
      locationId,
    }),
  );
  const notesQuery = useQuery(todaysManagerNotesQueryOptions(department, locationId));
  const issuesQuery = useQuery(openIssuesForEmployeeQueryOptions(employee.id));

  const inProgress = (queueQuery.data ?? []).filter((e) => e.needsTrainer && e.step);
  const notes = notesQuery.data ?? [];
  const issues = issuesQuery.data ?? [];
  const firstNote = notes[0]?.note_text ?? null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <Collapsible className={`${gridTileClass} col-span-2 sm:col-span-1`}>
        <CollapsibleTrigger className="w-full">
          <TileShell
            icon={<Users className="size-5" />}
            count={inProgress.length}
            label="Training in progress"
            subtext={divisionLabel(employee.department_scope ?? "universal")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-t border-border/70">
            {inProgress.length ? (
              inProgress.map((entry) => (
                <li key={entry.employee.id}>
                  <Link
                    to="/modules/$moduleId"
                    params={{ moduleId: entry.module!.id }}
                    search={{ step: entry.step?.id, trainee: entry.employee.id }}
                    className="flex min-h-11 items-center gap-2 px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {entry.employee.full_name ?? entry.employee.email}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {entry.lastNote ? entry.lastNote : entry.step?.title}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                Nobody is waiting on a trainer stop right now.
              </li>
            )}
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <Link to="/huddle-notes" search={{ view: "today" }} className={gridTileClass}>
        <TileShell
          icon={<StickyNote className="size-5" />}
          count={notes.length}
          label="Today's notes"
          subtext={
            firstNote ? (firstNote.length > 30 ? `${firstNote.slice(0, 30)}…` : firstNote) : null
          }
        />
      </Link>

      <Link to="/delivery-issues" className={gridTileClass}>
        <TileShell
          icon={<Truck className="size-5" />}
          count={issues.length}
          label="Delivery issues"
        />
      </Link>

      <Link to="/reference/sourcing" className={`${gridTileClass} col-span-2 sm:col-span-1`}>
        <TileShell
          icon={<Compass className="size-5" />}
          label="Sourcing board"
          subtext="Where products come from"
        />
      </Link>
    </div>
  );
}

/** Standalone sourcing tile for staff, who don't get the manager grid. */
export function SourcingTile() {
  return (
    <Link to="/reference/sourcing" className={`${gridTileClass} block`}>
      <TileShell
        icon={<Compass className="size-5" />}
        label="Sourcing board"
        subtext="Where products come from"
      />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Note add / delete — unchanged behaviour, reused by the notes view    */
/* ------------------------------------------------------------------ */

export function DeleteNoteButton({
  noteId,
  employeeId,
}: {
  noteId: string;
  employeeId: string;
}) {
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
      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label="Delete note"
      disabled={remove.isPending}
      onClick={() => {
        if (window.confirm("Remove this note for today?")) remove.mutate();
      }}
    >
      <X className="size-4" />
    </Button>
  );
}

export function AddNoteDialog({
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
