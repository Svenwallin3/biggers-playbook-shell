import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  GripVertical,
  ListChecks,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { VideoEmbed } from "@/components/VideoEmbed";
import { LineItemEditor } from "@/components/reference/LineItemEditor";
import { AddSectionButton } from "@/components/reference/AddSectionButton";
import { NewDocumentDialog } from "@/components/reference/NewDocumentDialog";
import { DocumentMetaEditDialog } from "@/components/reference/DocumentMetaEditDialog";
import { SectionBodyEditor } from "@/components/reference/SectionBodyEditor";
import { DangerZoneGraphic } from "@/components/training/DangerZoneGraphic";
import { useAuth } from "@/hooks/useAuth";
import { renderFormattedText, stripFormattingMarkup } from "@/lib/richText";
import {
  checklistCompletionsQueryOptions,
  completionKey,
  submitChecklistInstance,
  submittedTodayQueryOptions,
  todaysChecklistInstanceQueryOptions,
  toggleChecklistLine,
} from "@/lib/checklist-instances.queries";
import {
  docSections,
  saveReferenceSections,
  groupBy,
  divisionGroupLabel,
  locationLabel,
  referenceDocumentsQueryOptions,
  sectionLineItems,
  sharedLabel,
  softDeleteReferenceDocument,
  submitReferenceDeleteRequest,
  visibleToDivision,
  visibleToLocation,
  type ReferenceSection,
  type ReferenceDocumentRow,

  type ReferenceDocumentType,
  type SubCategoryFilter,
} from "@/lib/reference.queries";

function SharedTag({ departments }: { departments: string[] | null }) {
  const label = sharedLabel(departments);
  if (!label) return null;
  return (
    <span className="rounded-sm bg-info-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info">
      {label}
    </span>
  );
}

function CompletedTodayTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
      <CheckCircle2 className="size-3" />
      Completed today
    </span>
  );
}

function LocationTag({ location }: { location: string | null }) {
  if (!location) return null;
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {locationLabel(location)}
    </span>
  );
}

function DocumentPrintSheet({ doc, withSignoffLine }: { doc: ReferenceDocumentRow; withSignoffLine: boolean }) {
  const sections = docSections(doc);
  return (
    <div className="print-sheet">
      <h1 style={{ fontSize: "20pt", margin: "0 0 4pt" }}>{doc.title}</h1>
      {doc.sub_category ? (
        <p style={{ fontSize: "10pt", margin: "0 0 12pt", textTransform: "uppercase" }}>
          {doc.sub_category}
        </p>
      ) : null}
      {withSignoffLine ? (
        <p style={{ fontSize: "10pt", margin: "0 0 16pt" }}>
          Date: ______________ &nbsp;&nbsp; Completed by: ______________________
        </p>
      ) : null}
      {sections.map((section, i) => {
        const items = sectionLineItems(section);
        return (
          <div key={i} style={{ marginBottom: "16pt" }}>
            <h2 style={{ fontSize: "13pt", margin: "0 0 6pt" }}>{section.title}</h2>
            {items.length > 0 ? (
              <ol style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "11pt" }}>
                {items.map((item, idx) => (
                  <li key={idx} style={{ margin: "0 0 6pt" }}>
                    <span className="print-box" />
                    {idx + 1}. {stripFormattingMarkup(item.text)}
                  </li>
                ))}
              </ol>
            ) : section.body_text ? (
              <div style={{ fontSize: "11pt" }}>
                {section.body_text
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line && line !== "[[danger-zone]]")
                  .map((line, idx) => (
                    <p key={idx} style={{ margin: "0 0 6pt" }}>
                      {stripFormattingMarkup(line)}
                    </p>
                  ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Detail({
  doc,
  documentType,
  ephemeral,
  onBack,
}: {
  doc: ReferenceDocumentRow;
  documentType: ReferenceDocumentType;
  ephemeral: boolean;
  onBack: () => void;
}) {
  const { employee, isManagerOrOwner, isOwner, isGeneralManager } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  // Manager Guides: checkboxes are a scratch pad, nothing is persisted or submitted.
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>({});
  const persisted = docSections(doc);
  // Optimistic order while the save is in flight, so a drag lands instantly.
  const [draftOrder, setDraftOrder] = useState<ReferenceSection[] | null>(null);
  const sections = draftOrder ?? persisted;
  const isChecklist = documentType === "checklist";
  const tracksInstance = isChecklist && !ephemeral;
  // Section reordering is Owner/GM only and writes directly (no suggestion queue).
  const canReorderSections = (isOwner || isGeneralManager) && sections.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderSections = useMutation({
    mutationFn: async (next: ReferenceSection[]) => {
      await saveReferenceSections({
        documentId: doc.id,
        sections: next,
        updatedBy: employee?.id ?? null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
      setDraftOrder(null);
      toast.success("Section order updated.");
    },
    onError: () => {
      setDraftOrder(null);
      toast.error("Couldn't reorder sections.");
    },
  });

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    const next = [...sections];
    const moved = next[from];
    if (!moved) return;
    next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraftOrder(next);
    reorderSections.mutate(next);
  };

  // Drop any stale optimistic order once the refetched document arrives.
  useEffect(() => {
    if (!reorderSections.isPending) setDraftOrder(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.updated_at]);


  // Shared instance for today (per location when the doc carries a location_tag).
  const instanceQuery = useQuery(
    todaysChecklistInstanceQueryOptions(doc.id, doc.location_tag ?? null, tracksInstance),
  );
  const instance = instanceQuery.data ?? null;
  const completionsQuery = useQuery(
    checklistCompletionsQueryOptions(tracksInstance ? instance?.id : undefined),
  );
  const completions = completionsQuery.data ?? [];
  const doneMap = new Map(
    completions.map((c) => [completionKey(c.section_index, c.line_order), c.completed]),
  );
  const submitted = tracksInstance && instance?.status === "submitted";

  const totalLines = isChecklist
    ? sections.reduce((n, s) => n + sectionLineItems(s).length, 0)
    : 0;
  const doneLines = isChecklist
    ? sections.reduce(
        (n, s, si) =>
          n +
          sectionLineItems(s).filter((item, idx) => {
            const key = completionKey(si, item.order ?? idx);
            return ephemeral ? localChecks[key] : doneMap.get(key);
          }).length,
        0,
      )
    : 0;
  const allDone = totalLines > 0 && doneLines === totalLines;

  const toggle = useMutation({
    mutationFn: (input: { sectionIndex: number; lineOrder: number; completed: boolean }) =>
      toggleChecklistLine({
        instanceId: instance!.id,
        employeeId: employee?.id ?? null,
        ...input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["checklist-completions", instance?.id] }),
    onError: (err: Error) => toast.error("Couldn't save that", { description: err.message }),
  });

  const submit = useMutation({
    mutationFn: () =>
      submitChecklistInstance({ instanceId: instance!.id, employeeId: employee?.id ?? null }),
    onSuccess: async () => {
      toast.success("Checklist marked complete for today.");
      await queryClient.invalidateQueries({ queryKey: ["checklist-instance"] });
      await queryClient.invalidateQueries({ queryKey: ["checklist-submitted-today"] });
    },
    onError: (err: Error) => toast.error("Couldn't submit", { description: err.message }),
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await softDeleteReferenceDocument({ id: doc.id, deletedBy: employee?.id ?? null });
      await queryClient.invalidateQueries({ queryKey: ["reference-documents", documentType] });
      toast.success("Deleted. It's hidden from the library but still recoverable.");
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this document.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRequestDelete() {
    setRequesting(true);
    try {
      await submitReferenceDeleteRequest({
        documentId: doc.id,
        documentTitle: doc.title,
        submittedBy: employee!.id,
      });
      toast.success("Request sent — an Owner will review it. Nothing has changed yet.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send that request.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <>
      <DocumentPrintSheet doc={doc} withSignoffLine={tracksInstance} />
      <div className="space-y-6 print-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        {isOwner ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{doc.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This hides the document from the library. Nothing is permanently erased — the
                  record and its version history are kept and can be restored later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : isGeneralManager ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="size-4" />
                Request deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request deletion of “{doc.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will ask an Owner to delete “{doc.title}”. It stays visible until they
                  approve.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={requesting} onClick={handleRequestDelete}>
                  {requesting ? "Sending…" : "Send request"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {doc.sub_category ? (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {doc.sub_category}
            </span>
          ) : null}
          <StepStatusBadge status={doc.content_status} />
          <SharedTag departments={doc.departments} />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{doc.title}</h1>
        {isManagerOrOwner ? (
          <div className="-mt-1">
            <DocumentMetaEditDialog doc={doc} documentType={documentType} />
          </div>
        ) : null}
        {ephemeral ? (
          <p className="text-xs text-muted-foreground">
            Check items off as you go — this is just your place-keeper and isn&apos;t saved or
            submitted anywhere.
          </p>
        ) : null}
        {isManagerOrOwner && doc.content_notes ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Admin note:</span> {doc.content_notes}
          </p>
        ) : null}
      </div>

      {submitted ? (
        <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>
            Submitted by{" "}
            <span className="font-semibold">
              {instance?.submitter?.full_name ?? instance?.submitter?.email ?? "a teammate"}
            </span>{" "}
            at{" "}
            {instance?.submitted_at
              ? new Date(instance.submitted_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
            . Today&apos;s run is closed.
          </p>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center text-sm text-muted-foreground">
            <p>No sections in this document yet.</p>
            {isManagerOrOwner ? <AddSectionButton doc={doc} /> : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <Card key={i}>
              <Collapsible defaultOpen>
                <CardContent className="space-y-4 py-4 sm:py-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      <h2 className="font-display text-base font-semibold">{section.title}</h2>
                    </CollapsibleTrigger>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {canReorderSections ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === 0 || reorderSections.isPending}
                            onClick={() => reorderSections.mutate({ from: i, to: i - 1 })}
                          >
                            <ArrowUp className="size-4" />
                            <span className="sr-only">Move section up</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === sections.length - 1 || reorderSections.isPending}
                            onClick={() => reorderSections.mutate({ from: i, to: i + 1 })}
                          >
                            <ArrowDown className="size-4" />
                            <span className="sr-only">Move section down</span>
                          </Button>
                        </>
                      ) : null}
                      {isManagerOrOwner ? (
                        documentType === "checklist" ? (
                          <LineItemEditor doc={doc} sectionIndex={i} />
                        ) : (
                          <SectionBodyEditor doc={doc} sectionIndex={i} />
                        )
                      ) : null}
                    </div>
                  </div>

                  <CollapsibleContent className="space-y-4">
                {isChecklist ? (
                  <ol className="space-y-1">
                    {sectionLineItems(section).map((item, idx) => {
                      const lineOrder = item.order ?? idx;
                      const key = completionKey(i, lineOrder);
                      const checked = ephemeral
                        ? Boolean(localChecks[key])
                        : Boolean(doneMap.get(key));
                      const disabled = ephemeral
                        ? false
                        : submitted || !instance || toggle.isPending;
                      return (
                        <li key={idx}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm leading-relaxed transition-colors hover:bg-muted/60 ${
                              disabled ? "cursor-default" : ""
                            }`}
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(v) => {
                                if (ephemeral) {
                                  setLocalChecks((prev) => ({ ...prev, [key]: v === true }));
                                  return;
                                }
                                toggle.mutate({
                                  sectionIndex: i,
                                  lineOrder,
                                  completed: v === true,
                                });
                              }}
                            />
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                              {idx + 1}
                            </span>
                            <span className={checked ? "text-muted-foreground line-through" : ""}>
                              {item.text}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ol>
                ) : section.body_text ? (
                  <div className="space-y-2 text-sm leading-relaxed">
                    {section.body_text
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, idx) =>
                        line === "[[danger-zone]]" ? (
                          <DangerZoneGraphic key={idx} />
                        ) : (
                          <p key={idx}>{renderFormattedText(line)}</p>
                        ),
                      )}
                  </div>
                ) : null}

                {section.reference_photo_url ? (
                  <img
                    src={section.reference_photo_url}
                    alt={section.title}
                    loading="lazy"
                    className="max-h-72 w-full rounded-md object-cover"
                  />
                ) : null}

                <VideoEmbed url={section.video_url} title={section.title} />
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          ))}
          {isManagerOrOwner ? (
            <div className="flex justify-start">
              <AddSectionButton doc={doc} />
            </div>
          ) : null}

          {tracksInstance && !submitted && totalLines > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-3">
              <Button
                onClick={() => submit.mutate()}
                disabled={!allDone || !instance || submit.isPending}
              >
                {submit.isPending ? "Submitting…" : "Mark checklist complete for today"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {allDone
                  ? "Everything is checked — submitting closes today's run."
                  : `${doneLines} of ${totalLines} checked. Every line has to be checked before this can be submitted.`}
              </p>
            </div>
          ) : null}
        </div>
      )}
      </div>
    </>
  );
}

export function ReferenceDocumentsScreen({
  documentType,
  heading,
  blurb,
  subCategoryFilter,
  ephemeralChecklist = false,
  groupByDepartment = false,
}: {
  documentType: ReferenceDocumentType;
  heading: string;
  blurb: string;
  subCategoryFilter?: SubCategoryFilter;
  /** Manager Guides: checkboxes are local-only, nothing is submitted or persisted. */
  ephemeralChecklist?: boolean;
  /** Manager Guides: group by department instead of sub_category, and tag by location. */
  groupByDepartment?: boolean;
}) {
  const { employee, isManagerOrOwner, isOwner } = useAuth();
  const query = useQuery(referenceDocumentsQueryOptions(documentType, subCategoryFilter));
  const [openId, setOpenId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  // Per-division sub-category filter (Checklists / SOPs only). "" = All.
  const [subFilter, setSubFilter] = useState<Record<string, string>>({});
  // Owners have no department_scope, so "my department only" would filter to nothing —
  // default them to all departments until they explicitly toggle.
  const [overrideShowAll, setOverrideShowAll] = useState<boolean | null>(null);
  const showAllDepartments = overrideShowAll ?? isOwner;
  const [overrideShowAllLocations, setOverrideShowAllLocations] = useState<boolean | null>(null);
  const showAllLocations = overrideShowAllLocations ?? isOwner;

  const all = query.data ?? [];
  const department = employee?.department_scope ?? null;
  const deptScoped =
    isManagerOrOwner && showAllDepartments
      ? all
      : all.filter((d) => visibleToDivision(d.departments, department));
  const scoped =
    groupByDepartment || (isManagerOrOwner && showAllLocations)
      ? deptScoped
      : deptScoped.filter((d) =>
          visibleToLocation(d.location_tag ?? null, employee?.location_id ?? null),
        );
  const q = term.trim().toLowerCase();
  const docs = q ? scoped.filter((d) => d.title.toLowerCase().includes(q)) : scoped;

  const submittedQuery = useQuery(
    submittedTodayQueryOptions(
      documentType === "checklist" && !ephemeralChecklist ? all.map((d) => d.id) : [],
    ),
  );
  const submittedToday = submittedQuery.data ?? new Set<string>();

  const openDoc = all.find((d) => d.id === openId) ?? null;
  if (openDoc) {
    return (
      <Detail
        doc={openDoc}
        documentType={documentType}
        ephemeral={ephemeralChecklist}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const divisionOrder = ["Company-Wide", "Kitchen", "Markets", "Delivery"];
  const groups = groupBy(docs, (d) => divisionGroupLabel(d.departments)).sort(
    (a, b) => divisionOrder.indexOf(a[0]) - divisionOrder.indexOf(b[0]),
  );
  const Icon = documentType === "checklist" ? ListChecks : FileText;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        </div>
        {isManagerOrOwner ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideShowAll(!showAllDepartments)}
            >
              {showAllDepartments ? "My division only" : "Show all divisions"}
            </Button>
            {!groupByDepartment ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideShowAllLocations(!showAllLocations)}
              >
                {showAllLocations ? "My location only" : "Show all locations"}
              </Button>
            ) : null}
            <NewDocumentDialog
              documentType={documentType}
              label={documentType === "checklist" ? "Checklist" : "SOP"}
            />
          </div>
        ) : null}
      </div>

      {!query.isPending && !query.isError && scoped.length > 0 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`Filter ${heading.toLowerCase()} by title…`}
            className="h-11 pl-9 text-base"
          />
        </div>
      ) : null}

      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load this library.</p>
      ) : docs.length === 0 && q ? (
        <p className="text-sm text-muted-foreground">No {heading.toLowerCase()} match “{term}”.</p>
      ) : docs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-12 text-center">
            <Icon className="mx-auto size-8 text-muted-foreground" />
            <p className="font-display text-sm font-semibold">Nothing here yet</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {heading} for your division haven&apos;t been added yet. They&apos;ll show up here
              as soon as an owner loads them.
            </p>
            {isManagerOrOwner ? (
              <div className="flex justify-center pt-1">
                <NewDocumentDialog
                  documentType={documentType}
                  label={documentType === "checklist" ? "Checklist" : "SOP"}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([groupLabel, rows]) => {
            const subCategories = [
              ...new Set(rows.map((d) => d.sub_category?.trim()).filter(Boolean) as string[]),
            ].sort();
            const active = subFilter[groupLabel] ?? "";
            const visibleRows =
              groupByDepartment || !active
                ? rows
                : rows.filter((d) => (d.sub_category?.trim() || "") === active);
            return (
            <section key={groupLabel} className="space-y-2">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupLabel}
                  </h2>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
              {!groupByDepartment && subCategories.length > 1 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {["", ...subCategories].map((sc) => (
                    <Button
                      key={sc || "__all__"}
                      type="button"
                      variant={active === sc ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSubFilter((prev) => ({ ...prev, [groupLabel]: sc }))}
                    >
                      {sc || "All"}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2">
                {visibleRows.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="py-4">
                      <div className="flex w-full items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenId(doc.id)}
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium hover:underline">{doc.title}</span>
                          <StepStatusBadge status={doc.content_status} />
                          {groupByDepartment ? (
                            <LocationTag location={doc.location_tag ?? null} />
                          ) : (
                            <>
                              <SharedTag departments={doc.departments} />
                              <LocationTag location={doc.location_tag ?? null} />
                            </>
                          )}
                          {documentType === "checklist" &&
                          !ephemeralChecklist &&
                          submittedToday.has(doc.id) ? (
                            <CompletedTodayTag />
                          ) : null}
                        </button>
                        {isManagerOrOwner ? (
                          <DocumentMetaEditDialog doc={doc} documentType={documentType} />
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
