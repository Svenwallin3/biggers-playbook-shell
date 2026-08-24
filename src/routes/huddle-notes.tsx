import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  allHuddleCardsQueryOptions,
  allManagerNotesQueryOptions,
  createHuddleCard,
  createManagerNoteFull,
  setHuddleCardDeleted,
  setManagerNoteDeleted,
  todayISODate,
  todaysManagerNotesQueryOptions,
  huddleDepartmentForDivision,
  updateHuddleCard,
  updateManagerNote,
  type HuddleCardRow,
  type ManagerNoteRow,
} from "@/lib/huddle.queries";
import { AddNoteDialog, DeleteNoteButton } from "@/components/manager/ManagerDailyBrief";
import { StoredPhoto } from "@/components/PhotoUpload";
import { usePhotoUrl } from "@/lib/photo-storage";
import { Download } from "lucide-react";
import {
  divisionLabel,
  divisionOptions,
  locationLabel,
  locationOptions,
} from "@/lib/reference.queries";

const ALL = "__all__";
const SHARED = "__shared__";

const title = "Huddle & Notes — Biggers Training Platform";
const description = "Author the daily huddle card rotation and dated manager notes in-app.";

export const Route = createFileRoute("/huddle-notes")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: typeof search["view"] === "string" ? (search["view"] as string) : undefined,
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
  component: HuddleNotesPage,
});

function DepartmentPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Divisions</Label>
      <div className="grid grid-cols-2 gap-2">
        {divisionOptions.map((dept) => (
          <label key={dept} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.includes(dept)}
              onCheckedChange={(v) =>
                onChange(
                  v === true ? [...new Set([...value, dept])] : value.filter((d) => d !== dept),
                )
              }
            />
            {divisionLabel(dept)}
          </label>
        ))}
      </div>
    </div>
  );
}

function DepartmentFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All divisions</SelectItem>
        {divisionOptions.map((d) => (
          <SelectItem key={d} value={d}>
            {divisionLabel(d)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function HuddleCardsTab() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const cardsQuery = useQuery(allHuddleCardsQueryOptions());
  const [filter, setFilter] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HuddleCardRow | null>(null);
  const [category, setCategory] = useState("");
  const [standardText, setStandardText] = useState("");
  const [standardContext, setStandardContext] = useState("");
  const [managerTip, setManagerTip] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [sequenceOrder, setSequenceOrder] = useState("0");
  const [busy, setBusy] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-huddle-cards"] });

  const toggleDeleted = useMutation({
    mutationFn: (input: { id: string; deleted: boolean }) =>
      setHuddleCardDeleted({ ...input, actorId: employee?.id ?? null }),
    onSuccess: async () => {
      toast.success("Saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  function startNew() {
    setEditing(null);
    setCategory("");
    setStandardText("");
    setStandardContext("");
    setManagerTip("");
    setDepartments([]);
    const next = (cardsQuery.data ?? []).reduce((m, c) => Math.max(m, c.sequence_order), 0) + 1;
    setSequenceOrder(String(next));
    setOpen(true);
  }

  function startEdit(card: HuddleCardRow) {
    setEditing(card);
    setCategory(card.category);
    setStandardText(card.standard_text);
    setStandardContext(card.standard_context ?? "");
    setManagerTip(card.manager_tip);
    setDepartments(card.departments ?? []);
    setSequenceOrder(String(card.sequence_order));
    setOpen(true);
  }

  async function save() {
    if (!category.trim() || !standardText.trim() || !managerTip.trim()) {
      toast.error("Category, standard, and manager tip are all required.");
      return;
    }
    setBusy(true);
    const payload = {
      category: category.trim(),
      standardText: standardText.trim(),
      standardContext: standardContext.trim() || null,
      managerTip: managerTip.trim(),
      departments,
      sequenceOrder: Number(sequenceOrder) || 0,
    };
    try {
      if (editing) await updateHuddleCard(editing.id, payload);
      else await createHuddleCard({ ...payload, createdBy: employee?.id ?? null });
      await invalidate();
      toast.success(editing ? "Huddle card updated." : "Huddle card created.");
      setOpen(false);
    } catch (error) {
      toast.error("Couldn't save", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const rows = (cardsQuery.data ?? []).filter(
    (c) => filter === ALL || (c.departments ?? []).includes(filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DepartmentFilter value={filter} onChange={setFilter} />
        <Button onClick={startNew}>New huddle card</Button>
      </div>

      {cardsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading huddle cards…</p>
      ) : null}
      {cardsQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load huddle cards.</p>
      ) : null}
      {!cardsQuery.isPending && !rows.length ? (
        <p className="text-sm text-muted-foreground">No huddle cards yet.</p>
      ) : null}

      <div className="space-y-3">
        {rows.map((card) => (
          <div
            key={card.id}
            className={`rounded-lg border border-border p-3 ${
              card.is_deleted ? "opacity-55" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">#{card.sequence_order}</Badge>
              <span className="text-sm font-semibold">{card.category}</span>
              {(card.departments ?? []).map((d) => (
                <Badge key={d} variant="outline">
                  {divisionLabel(d)}
                </Badge>
              ))}
              {card.is_deleted ? <Badge variant="destructive">Removed</Badge> : null}
            </div>
            <p className="mt-2 text-sm">{card.standard_text}</p>
            {card.standard_context ? (
              <p className="mt-1 text-sm text-muted-foreground">{card.standard_context}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">Tip: {card.manager_tip}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant={card.is_deleted ? "secondary" : "ghost"}
                onClick={() =>
                  toggleDeleted.mutate({ id: card.id, deleted: !card.is_deleted })
                }
              >
                {card.is_deleted ? "Restore" : "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit huddle card" : "New huddle card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hc-category">Category</Label>
              <Input
                id="hc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Hospitality, Product knowledge…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hc-standard">Standard (the talking point)</Label>
              <Textarea
                id="hc-standard"
                rows={4}
                value={standardText}
                onChange={(e) => setStandardText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hc-context">Why it matters (shown to everyone)</Label>
              <Textarea
                id="hc-context"
                rows={2}
                value={standardContext}
                onChange={(e) => setStandardContext(e.target.value)}
                placeholder="One plain sentence of context under the standard."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hc-tip">Manager tip</Label>
              <Textarea
                id="hc-tip"
                rows={3}
                value={managerTip}
                onChange={(e) => setManagerTip(e.target.value)}
              />
            </div>
            <DepartmentPicker value={departments} onChange={setDepartments} />
            <div className="space-y-1.5">
              <Label htmlFor="hc-seq">Sequence order</Label>
              <Input
                id="hc-seq"
                type="number"
                value={sequenceOrder}
                onChange={(e) => setSequenceOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManagerNotesTab() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const notesQuery = useQuery(allManagerNotesQueryOptions());
  const [filter, setFilter] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagerNoteRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayISODate());
  const [departments, setDepartments] = useState<string[]>([]);
  const [locationTag, setLocationTag] = useState(SHARED);
  const [busy, setBusy] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-manager-notes"] });

  const toggleDeleted = useMutation({
    mutationFn: (input: { id: string; deleted: boolean }) =>
      setManagerNoteDeleted({ ...input, actorId: employee?.id ?? null }),
    onSuccess: async () => {
      toast.success("Saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  function startNew() {
    setEditing(null);
    setNoteText("");
    setEffectiveDate(todayISODate());
    setDepartments(employee?.department_scope ? [employee.department_scope] : []);
    setLocationTag(employee?.location_id ?? SHARED);
    setOpen(true);
  }

  function startEdit(note: ManagerNoteRow) {
    setEditing(note);
    setNoteText(note.note_text);
    setEffectiveDate(note.effective_date);
    setDepartments(note.departments ?? []);
    setLocationTag(note.location_tag ?? SHARED);
    setOpen(true);
  }

  async function save() {
    if (!noteText.trim() || !effectiveDate) {
      toast.error("Note text and an effective date are required.");
      return;
    }
    setBusy(true);
    const payload = {
      noteText: noteText.trim(),
      effectiveDate,
      departments,
      locationTag: locationTag === SHARED ? null : locationTag,
    };
    try {
      if (editing) await updateManagerNote(editing.id, payload);
      else await createManagerNoteFull({ ...payload, createdBy: employee?.id ?? null });
      await invalidate();
      toast.success(editing ? "Note updated." : "Note created.");
      setOpen(false);
    } catch (error) {
      toast.error("Couldn't save", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const rows = (notesQuery.data ?? []).filter(
    (n) => filter === ALL || (n.departments ?? []).includes(filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DepartmentFilter value={filter} onChange={setFilter} />
        <Button onClick={startNew}>New manager note</Button>
      </div>

      {notesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : null}
      {notesQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load manager notes.</p>
      ) : null}
      {!notesQuery.isPending && !rows.length ? (
        <p className="text-sm text-muted-foreground">No manager notes yet.</p>
      ) : null}

      <div className="space-y-3">
        {rows.map((note) => (
          <div
            key={note.id}
            className={`rounded-lg border border-border p-3 ${
              note.is_deleted ? "opacity-55" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{note.effective_date}</Badge>
              {(note.departments ?? []).map((d) => (
                <Badge key={d} variant="outline">
                  {divisionLabel(d)}
                </Badge>
              ))}
              {note.location_tag ? (
                <Badge variant="outline">{locationLabel(note.location_tag)}</Badge>
              ) : null}
              {note.is_deleted ? <Badge variant="destructive">Removed</Badge> : null}
            </div>
            <p className="mt-2 text-sm">{note.note_text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(note)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant={note.is_deleted ? "secondary" : "ghost"}
                onClick={() =>
                  toggleDeleted.mutate({ id: note.id, deleted: !note.is_deleted })
                }
              >
                {note.is_deleted ? "Restore" : "Remove"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit manager note" : "New manager note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mn-text">Note</Label>
              <Textarea
                id="mn-text"
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What the team needs to hear at today's huddle."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mn-date">Effective date</Label>
              <Input
                id="mn-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <DepartmentPicker value={departments} onChange={setDepartments} />
            <div className="space-y-1.5">
              <Label htmlFor="mn-loc">Location</Label>
              <Select value={locationTag} onValueChange={setLocationTag}>
                <SelectTrigger id="mn-loc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHARED}>All locations</SelectItem>
                  {locationOptions.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Read view: today's notes for the manager's own division, with photos. */
function TodayNotesTab() {
  const { employee, isOwner, isManagerOrOwner } = useAuth();
  const department = huddleDepartmentForDivision(employee?.department_scope ?? null);
  const locationId = employee?.location_id ?? null;
  const notesQuery = useQuery(todaysManagerNotesQueryOptions(department, locationId));
  const notes = notesQuery.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {notes.length} note{notes.length === 1 ? "" : "s"} for today · {divisionLabel(department)}
        </p>
        {employee ? (
          <AddNoteDialog
            department={department}
            locationId={locationId}
            employeeId={employee.id}
            isOwner={isOwner}
          />
        ) : null}
      </div>

      {notesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : notes.length ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed">
                  {note.note_text}
                </p>
                {isManagerOrOwner && employee ? (
                  <DeleteNoteButton noteId={note.id} employeeId={employee.id} />
                ) : null}
              </div>
              {note.photo_url ? <NotePhoto path={note.photo_url} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No notes for today yet.
        </p>
      )}
    </div>
  );
}

function NotePhoto({ path }: { path: string }) {
  const url = usePhotoUrl(path);
  return (
    <div className="mt-2 space-y-2">
      <StoredPhoto path={path} alt="Manager note photo" className="max-h-80" />
      {url.data ? (
        <a
          href={url.data}
          download
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Download className="size-4" /> Download photo
        </a>
      ) : null}
    </div>
  );
}

function HuddleNotesPage() {
  const { loading, session, isOwner, isManagerOrOwner } = useAuth();
  const { view } = Route.useSearch();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isManagerOrOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Huddle and manager notes authoring is for managers and owners.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Huddle &amp; Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write the huddle card rotation and the dated notes that show on the manager brief.
          Removed items are kept and can be restored.
        </p>
      </div>

      <Tabs defaultValue={view === "today" ? "today" : isOwner ? "huddle" : "notes"}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="today">Today</TabsTrigger>
          {isOwner ? <TabsTrigger value="huddle">Huddle cards</TabsTrigger> : null}
          <TabsTrigger value="notes">Manager notes</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <TodayNotesTab />
        </TabsContent>
        {isOwner ? (
          <TabsContent value="huddle" className="mt-4">
            <HuddleCardsTab />
          </TabsContent>
        ) : null}
        <TabsContent value="notes" className="mt-4">
          <ManagerNotesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
