import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  ListChecks,
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
import { SectionBodyEditor } from "@/components/reference/SectionBodyEditor";
import { useAuth } from "@/hooks/useAuth";
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
  groupBy,
  referenceDocumentsQueryOptions,
  sectionLineItems,
  sharedLabel,
  softDeleteReferenceDocument,
  visibleToDepartment,
  type ReferenceDocumentRow,
  type ReferenceDocumentType,
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

function Detail({
  doc,
  documentType,
  onBack,
}: {
  doc: ReferenceDocumentRow;
  documentType: ReferenceDocumentType;
  onBack: () => void;
}) {
  const { employee, isManagerOrOwner, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const sections = docSections(doc);
  const isChecklist = documentType === "checklist";

  // Shared instance for today (per location when the doc carries a location_tag).
  const instanceQuery = useQuery(
    todaysChecklistInstanceQueryOptions(doc.id, doc.location_tag ?? null, isChecklist),
  );
  const instance = instanceQuery.data ?? null;
  const completionsQuery = useQuery(checklistCompletionsQueryOptions(instance?.id));
  const completions = completionsQuery.data ?? [];
  const doneMap = new Map(
    completions.map((c) => [completionKey(c.section_index, c.line_order), c.completed]),
  );
  const submitted = instance?.status === "submitted";

  const totalLines = isChecklist
    ? sections.reduce((n, s) => n + sectionLineItems(s).length, 0)
    : 0;
  const doneLines = isChecklist
    ? sections.reduce(
        (n, s, si) =>
          n +
          sectionLineItems(s).filter((item, idx) =>
            doneMap.get(completionKey(si, item.order ?? idx)),
          ).length,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="size-4" />
          Back
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
        ) : null}
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
        {isManagerOrOwner && doc.content_notes ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Admin note:</span> {doc.content_notes}
          </p>
        ) : null}
      </div>

      {isChecklist && submitted ? (
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
                    {isManagerOrOwner ? (
                      documentType === "checklist" ? (
                        <LineItemEditor doc={doc} sectionIndex={i} />
                      ) : (
                        <SectionBodyEditor doc={doc} sectionIndex={i} />
                      )
                    ) : null}
                  </div>

                  <CollapsibleContent className="space-y-4">
                {isChecklist ? (
                  <ol className="space-y-1">
                    {sectionLineItems(section).map((item, idx) => {
                      const lineOrder = item.order ?? idx;
                      const checked = Boolean(doneMap.get(completionKey(i, lineOrder)));
                      const disabled = submitted || !instance || toggle.isPending;
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
                              onCheckedChange={(v) =>
                                toggle.mutate({
                                  sectionIndex: i,
                                  lineOrder,
                                  completed: v === true,
                                })
                              }
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
                      .map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
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

          {isChecklist && !submitted && totalLines > 0 ? (
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
  );
}

export function ReferenceDocumentsScreen({
  documentType,
  heading,
  blurb,
}: {
  documentType: ReferenceDocumentType;
  heading: string;
  blurb: string;
}) {
  const { employee, isManagerOrOwner, isOwner } = useAuth();
  const query = useQuery(referenceDocumentsQueryOptions(documentType));
  const [openId, setOpenId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  // Owners have no department_scope, so "my department only" would filter to nothing —
  // default them to all departments until they explicitly toggle.
  const [overrideShowAll, setOverrideShowAll] = useState<boolean | null>(null);
  const showAllDepartments = overrideShowAll ?? isOwner;

  const all = query.data ?? [];
  const department = employee?.department_scope ?? null;
  const scoped =
    isManagerOrOwner && showAllDepartments
      ? all
      : all.filter((d) => visibleToDepartment(d.departments, department));
  const q = term.trim().toLowerCase();
  const docs = q ? scoped.filter((d) => d.title.toLowerCase().includes(q)) : scoped;

  const submittedQuery = useQuery(
    submittedTodayQueryOptions(documentType === "checklist" ? all.map((d) => d.id) : []),
  );
  const submittedToday = submittedQuery.data ?? new Set<string>();

  const openDoc = all.find((d) => d.id === openId) ?? null;
  if (openDoc) {
    return <Detail doc={openDoc} documentType={documentType} onBack={() => setOpenId(null)} />;
  }

  const groups = groupBy(docs, (d) => d.sub_category?.trim() || "Uncategorized");
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
              {showAllDepartments ? "My department only" : "Show all departments"}
            </Button>
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
              {heading} for your department haven&apos;t been added yet. They&apos;ll show up here
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
          {groups.map(([subCategory, rows]) => (
            <section key={subCategory} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {subCategory}
              </h2>
              <div className="space-y-2">
                {rows.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenId(doc.id)}
                        className="flex w-full flex-wrap items-center gap-2 text-left"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium hover:underline">{doc.title}</span>
                        <StepStatusBadge status={doc.content_status} />
                        <SharedTag departments={doc.departments} />
                        {documentType === "checklist" && submittedToday.has(doc.id) ? (
                          <CompletedTodayTag />
                        ) : null}
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
