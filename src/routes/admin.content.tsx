import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

const stepTypeOptions: StepType[] = [
  "text",
  "photo",
  "video",
  "quiz",
  "doing_signoff",
  "supervised_live_practice",
];
const contentStatusOptions: ContentStatus[] = [
  "ready",
  "needs_restructuring",
  "missing",
  "blocked",
];

interface Draft {
  title: string;
  step_type: StepType;
  content_status: ContentStatus;
  content_body: string;
  content_notes: string;
  location_tag: string;
}

function ContentEditorPage() {
  const { employee, isManagerOrOwner, loading } = useAuth();
  const queryClient = useQueryClient();
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const tracks = treeQuery.data?.tracks ?? [];
  const modules = treeQuery.data?.modules ?? [];
  const steps = treeQuery.data?.steps ?? [];
  const step = steps.find((s) => s.id === selectedId);
  const stepModule = modules.find((m) => m.id === step?.module_id);
  const historyQuery = useQuery(versionHistoryQueryOptions("steps", selectedId || undefined));

  // Owners edit anything; managers only their own department. RLS enforces this
  // too — the UI just avoids offering an edit that would be rejected.
  const canEdit =
    employee?.auth_tier === "owner" ||
    (employee?.auth_tier === "manager" &&
      !!stepModule?.track &&
      stepModule.track.department === employee.department_scope);

  useEffect(() => {
    if (!selectedId && steps.length) setSelectedId(steps[0]!.id);
  }, [steps, selectedId]);

  useEffect(() => {
    if (!step) return;
    setDraft({
      title: step.title,
      step_type: step.step_type,
      content_status: step.content_status,
      content_body: step.content_body ?? "",
      content_notes: step.content_notes ?? "",
      location_tag: step.location_tag ?? "",
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-5">
          {tracks.map((track) => (
            <div key={track.id}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {track.name}
              </p>
              <div className="space-y-3">
                {modules
                  .filter((m) => m.track_id === track.id)
                  .map((m) => (
                    <div key={m.id}>
                      <p className="text-sm font-medium">
                        {m.name}
                        {m.is_deleted ? " (hidden)" : ""}
                      </p>
                      <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                        {steps
                          .filter((s) => s.module_id === m.id)
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
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
}
