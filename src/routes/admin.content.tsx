import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Eye, Film } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import {
  NewModuleDialog,
  NewStepDialog,
  NewTrackDialog,
  contentStatusOptions,
  stepTypeOptions,
} from "@/components/admin/ContentCreateDialogs";
import { ModuleEditPanel, TrackEditPanel } from "@/components/admin/EntityEditPanels";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { stepTypeLabels, type ContentStatus, type StepType } from "@/lib/training.queries";
import { contentTreeQueryOptions, versionHistoryQueryOptions } from "@/lib/admin.queries";

export const Route = createFileRoute("/admin/content")({
  head: () => ({
    meta: [
      { title: "Content Editor — Biggers Training" },
      {
        name: "description",
        content:
          "Admin editor for Biggers Market training content: browse tracks, modules and steps, edit step fields, and review version history.",
      },
      { property: "og:title", content: "Content Editor — Biggers Training" },
      {
        property: "og:description",
        content: "Edit training steps with soft delete and full version history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContentEditorPage,
});

interface Draft {
  title: string;
  step_type: StepType;
  content_status: ContentStatus;
  content_body: string;
  content_notes: string;
  location_tag: string;
  video_url: string;
  media_url: string | null;
  media_recommendation: "none" | "photo" | "video";
  media_recommendation_note: string;
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

function ContentEditorPage() {
  const { employee, isManagerOrOwner, loading } = useAuth();
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const [selection, setSelection] = useState<{
    kind: "step" | "module" | "track";
    id: string;
  }>({ kind: "step", id: "" });
  const selectedId = selection.kind === "step" ? selection.id : "";
  const setSelectedId = (id: string) => setSelection({ kind: "step", id });
  const [draft, setDraft] = useState<Draft | null>(null);

  const tracks = treeQuery.data?.tracks ?? [];
  const modules = treeQuery.data?.modules ?? [];
  const steps = treeQuery.data?.steps ?? [];
  const step = steps.find((s) => s.id === selectedId);
  const selectedModule =
    selection.kind === "module" ? modules.find((m) => m.id === selection.id) : undefined;
  const selectedTrack =
    selection.kind === "track" ? tracks.find((t) => t.id === selection.id) : undefined;
  const stepModule = modules.find((m) => m.id === step?.module_id);
  const historyQuery = useQuery(versionHistoryQueryOptions("steps", selectedId || undefined));

  // Owners edit anything; managers only their own department. RLS enforces this
  // too — the UI just avoids offering an edit that would be rejected.
  const canEdit =
    employee?.auth_tier === "owner" ||
    (employee?.auth_tier === "manager" &&
      !!stepModule?.track &&
      stepModule.track.department === employee.department_scope);

  // Same rule, applied to the row being created into (RLS enforces it too).
  const canEditDepartment = (department: string | null | undefined) =>
    employee?.auth_tier === "owner" ||
    (employee?.auth_tier === "manager" &&
      !!department &&
      department === employee.department_scope);
  const canCreateTrack = employee?.auth_tier === "owner" || employee?.auth_tier === "manager";

  useEffect(() => {
    if (!selection.id && steps.length) setSelectedId(steps[0]!.id);
  }, [steps, selection.id]);

  useEffect(() => {
    if (!step) return;
    setDraft({
      title: step.title,
      step_type: step.step_type,
      content_status: step.content_status,
      content_body: step.content_body ?? "",
      content_notes: step.content_notes ?? "",
      location_tag: step.location_tag ?? "",
      video_url: step.video_url ?? "",
      media_url: step.media_url ?? null,
      media_recommendation: step.media_recommendation ?? "none",
      media_recommendation_note: step.media_recommendation_note ?? "",
    });
  }, [step?.id, step?.updated_at]);

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
    void queryClient.invalidateQueries({ queryKey: ["version-history", "steps", selectedId] });
    void queryClient.invalidateQueries({ queryKey: ["module"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      // The steps update trigger writes the previous row into version_history.
      const { error } = await supabase
        .from("steps")
        .update({
          title: draft!.title.trim(),
          step_type: draft!.step_type,
          content_status: draft!.content_status,
          content_body: draft!.content_body.trim() || null,
          content_notes: draft!.content_notes.trim() || null,
          location_tag: draft!.location_tag.trim() || null,
          video_url: draft!.video_url.trim() || null,
          media_url: draft!.media_url,
          media_recommendation: draft!.media_recommendation,
          media_recommendation_note: draft!.media_recommendation_note.trim() || null,
        })
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Saved — previous version logged to history.");
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const softDelete = useMutation({
    mutationFn: async (hidden: boolean) => {
      const { error } = await supabase
        .from("steps")
        .update(
          hidden
            ? { is_deleted: true, deleted_by: employee!.id, deleted_at: new Date().toISOString() }
            : { is_deleted: false, deleted_by: null, deleted_at: null },
        )
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: (_d, hidden) => {
      refresh();
      toast.success(hidden ? "Step hidden — logged and restorable." : "Step restored.");
    },
    onError: (error: Error) => toast.error("Couldn't do that", { description: error.message }),
  });

  const restore = useMutation({
    mutationFn: async (snapshot: Record<string, unknown>) => {
      const { error } = await supabase
        .from("steps")
        .update({
          title: String(snapshot["title"] ?? step!.title),
          step_type: snapshot["step_type"] as StepType,
          content_status: snapshot["content_status"] as ContentStatus,
          content_body: (snapshot["content_body"] as string | null) ?? null,
          content_notes: (snapshot["content_notes"] as string | null) ?? null,
          location_tag: (snapshot["location_tag"] as string | null) ?? null,
        })
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Restored that version — the replaced one is logged too.");
    },
    onError: (error: Error) => toast.error("Couldn't restore", { description: error.message }),
  });

  if (loading) return null;
  if (!isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The content editor is for managers and owners.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content editor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Steps are the smallest editable unit — editing one never changes another. Deletes are soft
          and fully restorable.
        </p>
      </div>

      {treeQuery.isPending ? <p className="text-sm text-muted-foreground">Loading content…</p> : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <nav className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <NewTrackDialog disabled={!canCreateTrack} onCreated={() => undefined} />
          <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
            <Label htmlFor="show-hidden" className="text-xs font-medium text-muted-foreground">
              Show hidden
            </Label>
            <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
          </div>
          {tracks.filter((t) => showHidden || !t.is_deleted).map((track) => (
            <div key={track.id}>
              <button
                type="button"
                onClick={() => setSelection({ kind: "track", id: track.id })}
                className={`mb-2 w-full rounded px-2 py-1 text-left text-xs font-medium uppercase tracking-wide transition-colors hover:bg-muted ${
                  selection.kind === "track" && selection.id === track.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span className={track.is_deleted ? "line-through" : undefined}>{track.name}</span>
              </button>
              <div className="space-y-3">
                {modules
                  .filter((m) => m.track_id === track.id && (showHidden || !m.is_deleted))
                  .map((m) => (
                    <div key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: "module", id: m.id })}
                        className={`w-full rounded px-2 py-1 text-left text-sm font-medium transition-colors hover:bg-muted ${
                          selection.kind === "module" && selection.id === m.id ? "bg-muted" : ""
                        }`}
                      >
                        <span className={m.is_deleted ? "line-through" : undefined}>{m.name}</span>
                        {m.is_deleted ? " (hidden)" : ""}
                      </button>
                      <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                        {steps
                          .filter((s) => s.module_id === m.id && (showHidden || !s.is_deleted))
                          .map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(s.id)}
                                className={`w-full rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted ${
                                  selectedId === s.id
                                    ? "bg-muted font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span className={s.is_deleted ? "line-through" : undefined}>
                                  {s.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        <li>
                          <NewStepDialog
                            moduleId={m.id}
                            nextSequence={
                              steps.filter((s) => s.module_id === m.id).length + 1
                            }
                            disabled={!canEditDepartment(track.department)}
                            onCreated={(id) => setSelectedId(id)}
                          />
                        </li>
                      </ul>
                    </div>
                  ))}
                <NewModuleDialog
                  trackId={track.id}
                  nextSequence={modules.filter((m) => m.track_id === track.id).length + 1}
                  disabled={!canEditDepartment(track.department)}
                  onCreated={() => undefined}
                />
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-6">
          {selectedTrack ? (
            <TrackEditPanel
              track={selectedTrack}
              canEdit={canEditDepartment(selectedTrack.department)}
              employeeId={employee?.id}
            />
          ) : null}
          {selectedModule ? (
            <div className="space-y-3">
              <Link
                to="/modules/$moduleId"
                params={{ moduleId: selectedModule.id }}
                search={{ preview: true }}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary/60"
              >
                <Eye className="size-4" aria-hidden="true" />
                Preview as New Hire
              </Link>
              <ModuleEditPanel
                module={selectedModule}
                trackName={selectedModule.track?.name}
                canEdit={canEditDepartment(selectedModule.track?.department)}
                employeeId={employee?.id}
              />
            </div>
          ) : null}
          {step && draft ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Edit step</CardTitle>
                  <StepStatusBadge status={draft.content_status} />
                  {step.is_deleted ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}
                </div>
                <CardDescription>
                  {stepModule?.track?.name} · {stepModule?.name}
                  {!canEdit ? " — read-only: outside your department" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    maxLength={140}
                    disabled={!canEdit}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Step type</Label>
                    <Select
                      value={draft.step_type}
                      disabled={!canEdit}
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
                      disabled={!canEdit}
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

                <div className="space-y-2">
                  <Label htmlFor="body">Content body</Label>
                  <Textarea
                    id="body"
                    rows={6}
                    value={draft.content_body}
                    maxLength={4000}
                    disabled={!canEdit}
                    onChange={(e) => patch({ content_body: e.target.value })}
                    placeholder="One numbered step per line."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Content notes (admin-only)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={draft.content_notes}
                    maxLength={1000}
                    disabled={!canEdit}
                    onChange={(e) => patch({ content_notes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video">Video link (YouTube)</Label>
                  <Input
                    id="video"
                    value={draft.video_url}
                    maxLength={300}
                    disabled={!canEdit}
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
                  disabled={!canEdit}
                />

                <div className="space-y-2">
                  <Label htmlFor="loc">Location tag</Label>
                  <Input
                    id="loc"
                    value={draft.location_tag}
                    maxLength={60}
                    disabled={!canEdit}
                    onChange={(e) => patch({ location_tag: e.target.value })}
                  />
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button disabled={!canEdit || save.isPending} onClick={() => save.mutate()}>
                    {save.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {step.is_deleted ? (
                    <Button
                      variant="outline"
                      disabled={!canEdit || softDelete.isPending}
                      onClick={() => softDelete.mutate(false)}
                    >
                      Restore step
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={!canEdit}>
                          Soft-delete step
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hide this step?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The step is hidden from trainees and logged with who, when, and what. It
                            is never permanently deleted and can be restored at any time.
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
          ) : null}

          {selection.kind === "step" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
              <CardDescription>
                Every edit is captured. Restoring writes a new version — nothing is overwritten
                silently.
              </CardDescription>
            </CardHeader>
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
                          disabled={!canEdit || restore.isPending}
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
          </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
