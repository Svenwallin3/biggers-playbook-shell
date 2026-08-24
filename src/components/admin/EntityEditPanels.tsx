import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormattingTextarea } from "@/components/ui/formatting-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SignoffChecklistEditor, serializeChecklist } from "@/components/admin/SignoffChecklistEditor";
import { StepBlocksEditor, hasLegacyContent } from "@/components/admin/StepBlocksEditor";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { contentStatusOptions, stepTypeOptions } from "@/components/admin/ContentCreateDialogs";
import {
  moduleCategoryOptionsQueryOptions,
  submitModuleDeleteRequest,
  submitStepSuggestion,
  versionHistoryQueryOptions,
} from "@/lib/admin.queries";
import {
  branchOptionsQueryOptions,
  parseSignoffChecklist,
  stepTypeLabels,
  trainerSignoffTypes,
} from "@/lib/training.queries";
import type {
  ContentStatus,
  Department,
  SignoffChecklistItem,
  ModuleRow,
  StepRow,
  StepType,
  TrackRow,
} from "@/lib/training.queries";

const departmentOptions: Department[] = ["universal", "market", "kitchen", "delivery"];

/** Shared history list — mirrors the step editor's history card. */
function HistoryCard({
  entityType,
  entityId,
  label,
}: {
  entityType: "modules" | "tracks";
  entityId: string;
  label: string;
}) {
  const historyQuery = useQuery(versionHistoryQueryOptions(entityType, entityId));
  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CollapsibleTrigger className="group flex w-full items-start justify-between gap-3 text-left">
          <CardHeader className="flex-1">
            <CardTitle className="text-base">Version history</CardTitle>
            <CardDescription>
              Every edit is captured — nothing is overwritten silently.
            </CardDescription>
          </CardHeader>
          <ChevronDown
            className="mr-6 mt-6 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {historyQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : !historyQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">
                No recorded edits for this {label} yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {historyQuery.data.map((v) => {
                  const snap = (v.snapshot ?? {}) as Record<string, unknown>;
                  return (
                    <li key={v.id} className="border-b border-border pb-3 last:border-0">
                      <p className="text-sm font-medium">{String(snap["name"] ?? "Untitled")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                      </p>
                      {snap["description"] ? (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                          {String(snap["description"])}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

}

function DeleteControls({
  isDeleted,
  label,
  canEdit,
  pending,
  onToggle,
  requestOnly = false,
  targetName,
  onRequest,
}: {
  isDeleted: boolean;
  label: string;
  canEdit: boolean;
  pending: boolean;
  onToggle: (hidden: boolean) => void;
  requestOnly?: boolean;
  targetName?: string;
  onRequest?: () => void;
}) {
  if (isDeleted) {
    return (
      <Button variant="outline" disabled={!canEdit || pending} onClick={() => onToggle(false)}>
        Restore {label}
      </Button>
    );
  }
  if (requestOnly) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={!canEdit || pending}>
            Request deletion
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request deletion of “{targetName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This will ask an Owner to delete “{targetName}”. It stays visible until they approve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRequest?.()}>Send request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={!canEdit || pending}>
          Soft-delete {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hide this {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            The {label} is hidden from trainees and logged with who, when, and what. It is never
            permanently deleted and can be restored at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onToggle(true)}>Hide {label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useEntityMutations(
  table: "modules" | "tracks",
  id: string,
  employeeId: string | undefined,
  onSaved?: () => void,
) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
    void queryClient.invalidateQueries({ queryKey: ["version-history", table, id] });
    void queryClient.invalidateQueries({ queryKey: ["module"] });
  };

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from(table).update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Saved — previous version logged to history.");
      onSaved?.();
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const softDelete = useMutation({
    mutationFn: async (hidden: boolean) => {
      const { error } = await supabase
        .from(table)
        .update(
          (hidden
            ? { is_deleted: true, deleted_by: employeeId ?? null, deleted_at: new Date().toISOString() }
            : { is_deleted: false, deleted_by: null, deleted_at: null }) as never,
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, hidden) => {
      refresh();
      toast.success(hidden ? "Hidden — logged and restorable." : "Restored.");
    },
    onError: (error: Error) => toast.error("Couldn't do that", { description: error.message }),
  });

  return { save, softDelete };
}

export function ModuleEditPanel({
  module,
  trackName,
  department,
  canEdit,
  employeeId,
  deleteRequiresApproval = false,
  standalone = false,
  onSaved,
}: {
  module: ModuleRow;
  trackName: string | undefined;
  /** Division of the owning track — drives the branch (sub-path) picker options. */
  department?: Department | null;
  canEdit: boolean;
  employeeId: string | undefined;
  /** Called after a successful save — used to close the inline sheet. */
  onSaved?: () => void;
  /** GM path: the guard_module_delete trigger rejects a direct hide, so ask an Owner. */
  deleteRequiresApproval?: boolean;
  /**
   * Standalone/assignable authoring: branch, day assignment and sequence order are
   * meaningless here and a stray day number would silently un-standalone the module,
   * so those fields are neither rendered nor written.
   */
  standalone?: boolean;
}) {

  const empty = {
    name: module.name,
    description: module.description ?? "",
    path: module.path ?? "",
    day_assignment: module.day_assignment === null ? "" : String(module.day_assignment),
    sequence_order: String(module.sequence_order),
    location_tag: module.location_tag ?? "",
    is_assignable: module.is_assignable,
  };
  const [form, setForm] = useState(empty);
  useEffect(() => {
    setForm({
      name: module.name,
      description: module.description ?? "",
      path: module.path ?? "",
      day_assignment: module.day_assignment === null ? "" : String(module.day_assignment),
      sequence_order: String(module.sequence_order),
      location_tag: module.location_tag ?? "",
      is_assignable: module.is_assignable,
    });
  }, [module.id, module.updated_at]);
  const [category, setCategory] = useState(module.category ?? "");
  const [categoryIsCustom, setCategoryIsCustom] = useState(false);
  useEffect(() => {
    setCategory(module.category ?? "");
    setCategoryIsCustom(false);
  }, [module.id, module.updated_at]);
  const categoryQuery = useQuery({
    ...moduleCategoryOptionsQueryOptions(department ?? null),
    enabled: !!department,
  });
  const categoryChoices = Array.from(
    new Set([...(categoryQuery.data ?? []), ...(module.category ? [module.category] : [])]),
  ).sort();
  const patch = (p: Partial<typeof empty>) => setForm((f) => ({ ...f, ...p }));
  const branchQuery = useQuery({
    ...branchOptionsQueryOptions(department ?? null),
    enabled: !!department,
  });
  const branchOptions = branchQuery.data ?? [];
  const branchChoices = Array.from(
    new Set([...branchOptions, ...(module.path ? [module.path] : [])]),
  ).sort();
  const [pathIsCustom, setPathIsCustom] = useState(false);
  useEffect(() => {
    setPathIsCustom(false);
  }, [module.id]);
  const { save, softDelete } = useEntityMutations("modules", module.id, employeeId, onSaved);
  const requestDelete = useMutation({
    mutationFn: () =>
      submitModuleDeleteRequest({
        moduleId: module.id,
        moduleName: module.name,
        submittedBy: employeeId!,
      }),
    onSuccess: () =>
      toast.success("Request sent — an Owner will review it. Nothing has changed yet."),
    onError: (error: Error) =>
      toast.error("Couldn't send that request", { description: error.message }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Edit module</CardTitle>
            {module.is_deleted ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}
          </div>
          <CardDescription>
            {trackName}
            {!canEdit ? " — read-only: outside your division" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mod-name">Name</Label>
            <Input
              id="mod-name"
              value={form.name}
              maxLength={140}
              disabled={!canEdit}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mod-desc">Description</Label>
            <FormattingTextarea
              id="mod-desc"
              rows={3}
              value={form.description}
              maxLength={1000}
              disabled={!canEdit}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {standalone ? null : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mod-subpath">Branch (sub-path)</Label>
                  <Select
                    value={pathIsCustom ? "__custom__" : form.path || "__none__"}
                    disabled={!canEdit}
                    onValueChange={(v) => {
                      if (v === "__custom__") {
                        setPathIsCustom(true);
                        return;
                      }
                      setPathIsCustom(false);
                      patch({ path: v === "__none__" ? "" : v });
                    }}
                  >
                    <SelectTrigger id="mod-subpath">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {branchChoices.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {pathIsCustom ? (
                    <Input
                      aria-label="Custom branch name"
                      placeholder="New branch name"
                      value={form.path}
                      maxLength={60}
                      disabled={!canEdit}
                      onChange={(e) => patch({ path: e.target.value })}
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-day">Day assignment</Label>
                  <Input
                    id="mod-day"
                    type="number"
                    value={form.day_assignment}
                    disabled={!canEdit}
                    onChange={(e) => patch({ day_assignment: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-seq">Sequence order</Label>
                  <Input
                    id="mod-seq"
                    type="number"
                    value={form.sequence_order}
                    disabled={!canEdit}
                    onChange={(e) => patch({ sequence_order: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="mod-loc">Location tag</Label>
              <Input
                id="mod-loc"
                value={form.location_tag}
                maxLength={60}
                disabled={!canEdit}
                onChange={(e) => patch({ location_tag: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mod-assignable"
              checked={form.is_assignable}
              disabled={!canEdit}
              onCheckedChange={(v) => patch({ is_assignable: v === true })}
            />
            <Label htmlFor="mod-assignable" className="font-normal">
              Assignable module (restricted / assigned individually)
            </Label>
          </div>
          {form.is_assignable ? (
            <div className="space-y-2 sm:max-w-sm">
              <Label htmlFor="mod-category">Category</Label>
              <Select
                value={categoryIsCustom ? "__custom__" : category || "__none__"}
                disabled={!canEdit}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setCategoryIsCustom(true);
                    return;
                  }
                  setCategoryIsCustom(false);
                  setCategory(v === "__none__" ? "" : v);
                }}
              >
                <SelectTrigger id="mod-category">
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Uncategorized</SelectItem>
                  {categoryChoices.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {categoryIsCustom ? (
                <Input
                  aria-label="Custom category name"
                  placeholder="New category name"
                  value={category}
                  maxLength={60}
                  disabled={!canEdit}
                  onChange={(e) => setCategory(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canEdit || save.isPending}
              onClick={() =>
                save.mutate({
                  name: form.name.trim(),
                  description: form.description.trim() || null,
                  ...(standalone
                    ? {}
                    : {
                        path: form.path.trim() || null,
                        day_assignment: form.day_assignment ? Number(form.day_assignment) : null,
                        sequence_order: Number(form.sequence_order) || module.sequence_order,
                      }),
                  location_tag: form.location_tag.trim() || null,
                  is_assignable: form.is_assignable,
                  category: form.is_assignable ? category.trim() || null : null,
                })

              }
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            <DeleteControls
              isDeleted={module.is_deleted}
              label="module"
              canEdit={canEdit}
              pending={softDelete.isPending || requestDelete.isPending}
              onToggle={(hidden) => softDelete.mutate(hidden)}
              requestOnly={deleteRequiresApproval}
              targetName={module.name}
              onRequest={() => requestDelete.mutate()}
            />
          </div>
        </CardContent>
      </Card>
      <HistoryCard entityType="modules" entityId={module.id} label="module" />
    </>
  );
}

export function TrackEditPanel({
  track,
  canEdit,
  employeeId,
}: {
  track: TrackRow;
  canEdit: boolean;
  employeeId: string | undefined;
}) {
  const [form, setForm] = useState({
    name: track.name,
    slug: track.slug,
    department: track.department,
    description: track.description ?? "",
    sequence_order: String(track.sequence_order),
  });
  useEffect(() => {
    setForm({
      name: track.name,
      slug: track.slug,
      department: track.department,
      description: track.description ?? "",
      sequence_order: String(track.sequence_order),
    });
  }, [track.id, track.updated_at]);
  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const { save, softDelete } = useEntityMutations("tracks", track.id, employeeId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Edit track</CardTitle>
            {track.is_deleted ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}
          </div>
          <CardDescription>
            Top-level track
            {!canEdit ? " — read-only: outside your division" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="track-edit-name">Name</Label>
            <Input
              id="track-edit-name"
              value={form.name}
              maxLength={120}
              disabled={!canEdit}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="track-edit-slug">Slug</Label>
              <Input
                id="track-edit-slug"
                value={form.slug}
                maxLength={60}
                disabled={!canEdit}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={form.department}
                disabled={!canEdit}
                onValueChange={(v) => patch({ department: v as Department })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-edit-desc">Description</Label>
            <Textarea
              id="track-edit-desc"
              rows={3}
              value={form.description}
              maxLength={1000}
              disabled={!canEdit}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-edit-seq">Sequence order</Label>
            <Input
              id="track-edit-seq"
              type="number"
              value={form.sequence_order}
              disabled={!canEdit}
              onChange={(e) => patch({ sequence_order: e.target.value })}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canEdit || save.isPending}
              onClick={() =>
                save.mutate({
                  name: form.name.trim(),
                  slug: form.slug.trim(),
                  department: form.department,
                  description: form.description.trim() || null,
                  sequence_order: Number(form.sequence_order) || track.sequence_order,
                })
              }
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            <DeleteControls
              isDeleted={track.is_deleted}
              label="track"
              canEdit={canEdit}
              pending={softDelete.isPending}
              onToggle={(hidden) => softDelete.mutate(hidden)}
            />
          </div>
        </CardContent>
      </Card>
      <HistoryCard entityType="tracks" entityId={track.id} label="track" />
    </>
  );
}
/** A curation flag only: the step asks for media it doesn't have yet. */
function unmetMediaRecommendation(s: {
  media_recommendation?: "none" | "photo" | "video" | null;
  media_url?: string | null;
  video_url?: string | null;
}) {
  if (s.media_recommendation === "photo" && !s.media_url) return "photo" as const;
  if (s.media_recommendation === "video" && !s.video_url) return "video" as const;
  return null;
}

interface StepDraft {
  title: string;
  step_type: StepType;
  content_status: ContentStatus;
  content_body: string;
  content_notes: string;
  location_tag: string;
  card_override_text: string;
  hide_module_card: boolean;
  video_url: string;
  media_url: string | null;
  media_recommendation: "none" | "photo" | "video";
  media_recommendation_note: string;
  signoff_checklist: SignoffChecklistItem[];
}

function draftFromStep(step: StepRow): StepDraft {
  return {
    title: step.title,
    step_type: step.step_type,
    content_status: step.content_status,
    content_body: step.content_body ?? "",
    content_notes: step.content_notes ?? "",
    location_tag: step.location_tag ?? "",
    card_override_text: step.card_override_text ?? "",
    hide_module_card: step.hide_module_card ?? false,
    video_url: step.video_url ?? "",
    media_url: step.media_url ?? null,
    media_recommendation: step.media_recommendation ?? "none",
    media_recommendation_note: step.media_recommendation_note ?? "",
    signoff_checklist: parseSignoffChecklist(step.signoff_checklist),
  };
}

export function StepEditPanel({
  step,
  stepModule,
  canEditDirect,
  canSuggest,
  employeeId,
  onSaved,
}: {
  step: StepRow;
  stepModule: (ModuleRow & { track?: TrackRow | null | undefined }) | undefined;
  canEditDirect: boolean;
  canSuggest: boolean;
  employeeId: string | undefined;
  /** Called after a successful save/suggest — used to close the inline sheet. */
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<StepDraft>(() => draftFromStep(step));
  const [suggestionWhy, setSuggestionWhy] = useState("");
  useEffect(() => {
    setDraft(draftFromStep(step));
  }, [step.id, step.updated_at]);
  const patch = (p: Partial<StepDraft>) => setDraft((d) => ({ ...d, ...p }));

  // Once a step is block-based the legacy content_body form no longer describes what a
  // trainee sees — hide it for everyone, managers and GM/Owner alike.
  const blockCountQuery = useQuery({
    queryKey: ["step-blocks", step.id, "count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("step_blocks")
        .select("id", { count: "exact", head: true })
        .eq("step_id", step.id)
        .eq("is_deleted", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const hasBlocks = (blockCountQuery.data ?? 0) > 0;
  const legacyHasContent = hasLegacyContent({
    content_body: step.content_body,
    media_url: step.media_url,
    video_url: step.video_url,
  });
  const blockFirst = hasBlocks || !legacyHasContent;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
    void queryClient.invalidateQueries({ queryKey: ["version-history", "steps", step.id] });
    void queryClient.invalidateQueries({ queryKey: ["module"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      // The steps update trigger writes the previous row into version_history.
      const { error } = await supabase
        .from("steps")
        .update({
          title: draft.title.trim(),
          step_type: draft.step_type,
          content_status: draft.content_status,
          content_body: draft.content_body.trim() || null,
          content_notes: draft.content_notes.trim() || null,
          location_tag: draft.location_tag.trim() || null,
          card_override_text: draft.card_override_text.trim() || null,
          hide_module_card: draft.hide_module_card,
          video_url: draft.video_url.trim() || null,
          media_url: draft.media_url,
          media_recommendation: draft.media_recommendation,
          media_recommendation_note: draft.media_recommendation_note.trim() || null,
          signoff_checklist: serializeChecklist(draft.signoff_checklist),
        })
        .eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Saved — previous version logged to history.");
      onSaved?.();
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const softDelete = useMutation({
    mutationFn: async (hidden: boolean) => {
      const { error } = await supabase
        .from("steps")
        .update(
          hidden
            ? { is_deleted: true, deleted_by: employeeId!, deleted_at: new Date().toISOString() }
            : { is_deleted: false, deleted_by: null, deleted_at: null },
        )
        .eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: (_d, hidden) => {
      refresh();
      toast.success(hidden ? "Step hidden — logged and restorable." : "Step restored.");
    },
    onError: (error: Error) => toast.error("Couldn't do that", { description: error.message }),
  });


  const suggest = useMutation({
    mutationFn: async () => {
      await submitStepSuggestion({
        stepId: step.id,
        submittedBy: employeeId!,
        title: draft.title.trim(),
        contentBody: draft.content_body.trim(),
        howYouKnow: suggestionWhy.trim() || null,
      });
    },
    onSuccess: () => {
      setSuggestionWhy("");
      toast.success("Sent to the Owner approval queue.");
      onSaved?.();
    },
    onError: (error: Error) => toast.error("Couldn't submit", { description: error.message }),
  });




  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Edit step</CardTitle>
            <StepStatusBadge status={draft.content_status} />
            {step.is_deleted ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}
          </div>
          <CardDescription>
            {stepModule?.track?.name} · {stepModule?.name}
            {canEditDirect
              ? ""
              : canSuggest
                ? " — You can suggest a change to the title and content below — it goes to the Owner approval queue."
                : " — read-only: outside your division"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              maxLength={140}
              disabled={!canEditDirect && !canSuggest}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Step type</Label>
              <Select
                value={draft.step_type}
                disabled={!canEditDirect}
                onValueChange={(v) => patch({ step_type: v as StepType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stepTypeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {stepTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content status</Label>
              <Select
                value={draft.content_status}
                disabled={!canEditDirect}
                onValueChange={(v) => patch({ content_status: v as ContentStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {blockFirst ? (
            hasBlocks || !canEditDirect ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5">
              <p className="text-sm font-medium">This step uses content blocks</p>
              {hasBlocks && canEditDirect ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit them below — the plain-text body and legacy media fields no longer affect
                  what a trainee sees.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Block-based content isn&apos;t editable from here yet. To recommend a change, use
                  the Flag button on the step itself — it goes to your manager and never applies
                  automatically.
                </p>
              )}
            </div>
            ) : null
          ) : (
            <div className="space-y-2">
              <Label htmlFor="body">Content body</Label>
              <FormattingTextarea
                id="body"
                rows={6}
                value={draft.content_body}
                maxLength={4000}
                disabled={!canEditDirect && !canSuggest}
                onChange={(e) => patch({ content_body: e.target.value })}
                placeholder="One numbered step per line."
              />
            </div>
          )}

          {canSuggest && !blockFirst ? (
            <div className="space-y-2">
              <Label htmlFor="why">How do you know it should change?</Label>
              <Textarea
                id="why"
                rows={3}
                value={suggestionWhy}
                maxLength={1000}
                onChange={(e) => setSuggestionWhy(e.target.value)}
                placeholder="What you'd check before you'd sign off on it."
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Content notes (admin-only)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={draft.content_notes}
              maxLength={1000}
              disabled={!canEditDirect}
              onChange={(e) => patch({ content_notes: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="card-override">Intro card override (optional)</Label>
              <Textarea
                id="card-override"
                rows={2}
                value={draft.card_override_text}
                maxLength={600}
                disabled={!canEditDirect || draft.hide_module_card}
                onChange={(e) => patch({ card_override_text: e.target.value })}
                placeholder="Leave empty to show the module's own intro card text."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-module-card"
                checked={draft.hide_module_card}
                disabled={!canEditDirect}
                onCheckedChange={(v) => patch({ hide_module_card: v === true })}
              />
              <Label htmlFor="hide-module-card" className="font-normal">
                Hide the module intro card on this step
              </Label>
            </div>
          </div>

          {blockFirst ? null : (
            <>
              <div className="space-y-2">
                <Label htmlFor="video">Video link (YouTube)</Label>
                <Input
                  id="video"
                  value={draft.video_url}
                  maxLength={300}
                  disabled={!canEditDirect}
                  onChange={(e) => patch({ video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
              </div>

              <PhotoUpload
                value={draft.media_url}
                onChange={(value) => patch({ media_url: value })}
                folder="steps"
                label="Photo (optional)"
                helpText="Shown above the step's written content. Any step type can carry a photo."
                disabled={!canEditDirect}
              />
            </>
          )}

          {canEditDirect && trainerSignoffTypes.includes(draft.step_type) ? (
            <SignoffChecklistEditor
              items={draft.signoff_checklist}
              disabled={!canEditDirect}
              onChange={(signoff_checklist) => patch({ signoff_checklist })}
            />
          ) : null}

          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="media-rec" className="text-xs text-muted-foreground">
                Media recommendation
              </Label>
              <Select
                value={draft.media_recommendation}
                disabled={!canEditDirect}
                onValueChange={(v) =>
                  patch({ media_recommendation: v as StepDraft["media_recommendation"] })
                }
              >
                <SelectTrigger id="media-rec" className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              {unmetMediaRecommendation({
                media_recommendation: draft.media_recommendation,
                media_url: draft.media_url,
                video_url: draft.video_url.trim() || null,
              }) ? (
                <span className="text-xs font-medium text-warning">Not added yet</span>
              ) : null}
            </div>
            <Input
              className="mt-2 h-8 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
              value={draft.media_recommendation_note}
              maxLength={200}
              disabled={!canEditDirect}
              onChange={(e) => patch({ media_recommendation_note: e.target.value })}
              placeholder="Why this step wants media (optional)"
              aria-label="Media recommendation note"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc">Location tag</Label>
            <Input
              id="loc"
              value={draft.location_tag}
              maxLength={60}
              disabled={!canEditDirect}
              onChange={(e) => patch({ location_tag: e.target.value })}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {canSuggest ? (
              blockFirst ? null : (
              <Button disabled={suggest.isPending || !employeeId} onClick={() => suggest.mutate()}>
                {suggest.isPending ? "Submitting…" : "Submit for approval"}
              </Button>
              )
            ) : (
              <Button disabled={!canEditDirect || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
            {step.is_deleted ? (
              <Button
                variant="outline"
                disabled={!canEditDirect || softDelete.isPending}
                onClick={() => softDelete.mutate(false)}
              >
                Restore step
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={!canEditDirect}>
                    Soft-delete step
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hide this step?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The step is hidden from trainees and logged with who, when, and what. It is
                      never permanently deleted and can be restored at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => softDelete.mutate(true)}>
                      Hide step
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {canEditDirect ? (
        <StepBlocksEditor
          stepId={step.id}
          employeeId={employeeId}
          legacy={{
            content_body: step.content_body,
            media_url: step.media_url,
            video_url: step.video_url,
          }}
        />
      ) : null}

      <StepHistoryCard step={step} canEditDirect={canEditDirect} />


    </>
  );
}

/**
 * Step version history — collapsed by default, shared by the dense step editor and the
 * lighter standalone-module step editor.
 */
export function StepHistoryCard({
  step,
  canEditDirect,
}: {
  step: StepRow;
  canEditDirect: boolean;
}) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery(versionHistoryQueryOptions("steps", step.id));
  const restore = useMutation({
    mutationFn: async (snapshot: Record<string, unknown>) => {
      const { error } = await supabase
        .from("steps")
        .update({
          title: String(snapshot["title"] ?? step.title),
          step_type: snapshot["step_type"] as StepType,
          content_status: snapshot["content_status"] as ContentStatus,
          content_body: (snapshot["content_body"] as string | null) ?? null,
          content_notes: (snapshot["content_notes"] as string | null) ?? null,
          location_tag: (snapshot["location_tag"] as string | null) ?? null,
        })
        .eq("id", step.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["version-history", "steps", step.id] });
      void queryClient.invalidateQueries({ queryKey: ["module"] });
      toast.success("Restored that version — the replaced one is logged too.");
    },
    onError: (error: Error) => toast.error("Couldn't restore", { description: error.message }),
  });

  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CollapsibleTrigger className="group flex w-full items-start justify-between gap-3 text-left">
          <CardHeader className="flex-1">
            <CardTitle className="text-base">Version history</CardTitle>
            <CardDescription>
              Every edit is captured. Restoring writes a new version — nothing is overwritten
              silently.
            </CardDescription>
          </CardHeader>
          <ChevronDown
            className="mr-6 mt-6 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {historyQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : !historyQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">No recorded edits for this step yet.</p>
            ) : (
              <ul className="space-y-3">
                {historyQuery.data.map((v) => {
                  const snap = (v.snapshot ?? {}) as Record<string, unknown>;
                  return (
                    <li
                      key={v.id}
                      className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{String(snap["title"] ?? "Untitled")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleString()} ·{" "}
                          {String(snap["content_status"] ?? "")}
                        </p>
                        {snap["content_body"] ? (
                          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                            {String(snap["content_body"])}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canEditDirect || restore.isPending}
                        onClick={() => restore.mutate(snap)}
                      >
                        Restore this version
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
