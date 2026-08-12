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
import { SortableContentTree } from "@/components/admin/SortableContentTree";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { stepTypeLabels, type ContentStatus, type StepType } from "@/lib/training.queries";
import {
  contentTreeQueryOptions,
  submitStepSuggestion,
  versionHistoryQueryOptions,
} from "@/lib/admin.queries";

export const Route = createFileRoute("/admin/content")({
  validateSearch: (search: Record<string, unknown>): { stepId?: string | undefined } => ({
    // Deep link from the step viewer: open straight to this step's edit panel.
    stepId: typeof search["stepId"] === "string" ? search["stepId"] : undefined,
  }),
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
  const { employee, isManagerOrOwner, isOwner, isGeneralManager, loading } = useAuth();
  const { stepId } = Route.useSearch();
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const [selection, setSelection] = useState<{
    kind: "step" | "module" | "track";
    id: string;
  }>({ kind: "step", id: stepId ?? "" });
  const selectedId = selection.kind === "step" ? selection.id : "";
  const setSelectedId = (id: string) => setSelection({ kind: "step", id });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [suggestionWhy, setSuggestionWhy] = useState("");

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

  // Same rule, applied to the row being created into (RLS enforces it too).
  const canEditDepartment = (department: string | null | undefined) =>
    employee?.auth_tier === "owner" ||
    (employee?.auth_tier === "manager" &&
      !!department &&
      department === employee.department_scope);

  // Direct-edit authority for existing content (post-2026-08-11 tightening): Owner or GM only.
  // Creating new content is still any-manager — see canEditDepartment above.
  const canEditDirectInDepartment = (department: string | null | undefined) =>
    employee?.auth_tier === "owner" ||
    (isGeneralManager && !!department && department === employee?.department_scope);

  const canEditDirect = canEditDirectInDepartment(stepModule?.track?.department);
  // A regular (non-GM) manager, own department, sees an editable title/content_body form
  // that submits to the approval queue instead of a direct save.
  const canSuggest =
    isManagerOrOwner &&
    !canEditDirect &&
    !!stepModule?.track &&
    stepModule.track.department === employee?.department_scope;

  const canCreateTrack = employee?.auth_tier === "owner" || employee?.auth_tier === "manager";

  // Drag-and-drop authorisation (UX layer only — the database is the boundary).
  const canReorderTracks = isOwner || isGeneralManager;
  const canReorderModulesIn = (track: { department: string | null }) =>
    isOwner || isGeneralManager || canEditDepartment(track.department);

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

  const suggest = useMutation({
    mutationFn: async () => {
      await submitStepSuggestion({
        stepId: selectedId,
        submittedBy: employee!.id,
        title: draft!.title.trim(),
        contentBody: draft!.content_body.trim(),
        howYouKnow: suggestionWhy.trim() || null,
      });
    },
    onSuccess: () => {
      setSuggestionWhy("");
      toast.success("Sent to the Owner approval queue.");
    },
    onError: (error: Error) => toast.error("Couldn't submit", { description: error.message }),
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
          <SortableContentTree
            tracks={tracks.filter((t) => showHidden || !t.is_deleted)}
            modules={modules.filter((m) => showHidden || !m.is_deleted)}
            steps={steps.filter((s) => showHidden || !s.is_deleted)}
            selection={selection}
            onSelect={setSelection}
            canReorderTracks={canReorderTracks}
            canReorderModulesIn={canReorderModulesIn}
            renderTrackLabel={(track) => (
              <span className={track.is_deleted ? "line-through" : undefined}>{track.name}</span>
            )}
            renderModuleLabel={(m) => (
              <>
                <span className={m.is_deleted ? "line-through" : undefined}>{m.name}</span>
                {m.is_deleted ? " (hidden)" : ""}
              </>
            )}
            renderTrackFooter={(track) => (
              <NewModuleDialog
                trackId={track.id}
                nextSequence={modules.filter((m) => m.track_id === track.id).length + 1}
                disabled={!canEditDepartment(track.department)}
                onCreated={() => undefined}
              />
            )}
            renderStepLabel={(s) => (
              <span className="flex items-center gap-1.5">
                <span className={s.is_deleted ? "line-through" : undefined}>{s.title}</span>
                {unmetMediaRecommendation(s) === "photo" ? (
                  <Camera
                    className="size-3.5 shrink-0 text-warning"
                    aria-label="Photo recommended, not added yet"
                  />
                ) : unmetMediaRecommendation(s) === "video" ? (
                  <Film
                    className="size-3.5 shrink-0 text-warning"
                    aria-label="Video recommended, not added yet"
                  />
                ) : null}
              </span>
            )}
            renderModuleChildren={(m, track) => (
              <NewStepDialog
                moduleId={m.id}
                nextSequence={steps.filter((s) => s.module_id === m.id).length + 1}
                disabled={!canEditDepartment(track.department)}
                onCreated={(id) => setSelectedId(id)}
              />
            )}
          />
        </nav>

        <div className="space-y-6">
          {selectedTrack ? (
            <TrackEditPanel
              track={selectedTrack}
              canEdit={canEditDirectInDepartment(selectedTrack.department)}
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
                canEdit={canEditDirectInDepartment(selectedModule.track?.department)}
                employeeId={employee?.id}
                deleteRequiresApproval={isGeneralManager && !isOwner}
              />
            </div>
          ) : null}
          {step ? (
            <StepEditPanel
              key={step.id}
              step={step}
              stepModule={stepModule}
              canEditDirect={canEditDirect}
              canSuggest={canSuggest}
              employeeId={employee?.id}
            />
          ) : null}

          {step && step.step_type === "quiz" ? (
            <QuizQuestionsPanel key={step.id} stepId={step.id} />
          ) : null}

        </div>
      </div>
    </div>
  );
}
