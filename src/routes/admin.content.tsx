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
import {
  ModuleEditPanel,
  StepEditPanel,
  TrackEditPanel,
} from "@/components/admin/EntityEditPanels";
import { SortableContentTree } from "@/components/admin/SortableContentTree";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { stepTypeLabels, type ContentStatus, type StepType } from "@/lib/training.queries";
import { contentTreeQueryOptions } from "@/lib/admin.queries";

export const Route = createFileRoute("/admin/content")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { stepId?: string | undefined; moduleId?: string | undefined } => ({
    // Deep link from the step viewer: open straight to this step's edit panel.
    stepId: typeof search["stepId"] === "string" ? search["stepId"] : undefined,
    // Deep link from Assign Training: open straight to this module's edit panel.
    moduleId: typeof search["moduleId"] === "string" ? search["moduleId"] : undefined,
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
  const { stepId, moduleId } = Route.useSearch();
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const [selection, setSelection] = useState<{
    kind: "step" | "module" | "track";
    id: string;
    // Steps stay the more specific selection when both params are present.
  }>(
    stepId
      ? { kind: "step", id: stepId }
      : moduleId
        ? { kind: "module", id: moduleId }
        : { kind: "step", id: "" },
  );

  const selectedId = selection.kind === "step" ? selection.id : "";
  const setSelectedId = (id: string) => setSelection({ kind: "step", id });
  const tracks = treeQuery.data?.tracks ?? [];
  const modules = treeQuery.data?.modules ?? [];
  const steps = treeQuery.data?.steps ?? [];
  const step = steps.find((s) => s.id === selectedId);
  const selectedModule =
    selection.kind === "module" ? modules.find((m) => m.id === selection.id) : undefined;
  const selectedTrack =
    selection.kind === "track" ? tracks.find((t) => t.id === selection.id) : undefined;
  const stepModule = modules.find((m) => m.id === step?.module_id);

  // Same rule, applied to the row being created into (RLS enforces it too).
  const canEditDepartment = (department: string | null | undefined) =>
    isOwner || (isGeneralManager && !!department && department === employee?.department_scope);

  // Direct-edit authority for existing content (post-2026-08-11 tightening): Owner or GM only.
  // Creating new content is still any-manager — see canEditDepartment above.
  const canEditDirectInDepartment = (department: string | null | undefined) =>
    employee?.auth_tier === "owner" ||
    (isGeneralManager && !!department && department === employee?.department_scope);

  const canEditDirect = canEditDirectInDepartment(stepModule?.track?.department);

  const canCreateTrack = isOwner || isGeneralManager;

  // Drag-and-drop authorisation (UX layer only — the database is the boundary).
  const canReorderTracks = isOwner || isGeneralManager;
  const canReorderModulesIn = (track: { department: string | null }) =>
    isOwner || (isGeneralManager && track.department === employee?.department_scope);

  useEffect(() => {
    if (!selection.id && steps.length) setSelectedId(steps[0]!.id);
  }, [steps, selection.id]);

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
          {canCreateTrack ? <NewTrackDialog onCreated={() => undefined} /> : null}
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
            renderTrackFooter={(track) =>
              canEditDepartment(track.department) ? (
              <NewModuleDialog
                trackId={track.id}
                department={track.department}
                nextSequence={modules.filter((m) => m.track_id === track.id).length + 1}
                onCreated={() => undefined}
              />
              ) : null
            }
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
            renderModuleChildren={(m, track) =>
              canEditDepartment(track.department) ? (
              <NewStepDialog
                moduleId={m.id}
                nextSequence={steps.filter((s) => s.module_id === m.id).length + 1}
                canEditDirect={canEditDirectInDepartment(track.department)}
                onCreated={(id) => setSelectedId(id)}
              />
              ) : null
            }
          />
        </nav>

        <div className="space-y-6">
          {selectedTrack ? (
            <TrackEditPanel
              track={selectedTrack}
              canEdit={canEditDirectInDepartment(selectedTrack.department)}
              employeeId={employee?.id}
              deleteRequiresApproval={isGeneralManager && !isOwner}
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
