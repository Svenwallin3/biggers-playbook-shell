import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { supabase } from "@/integrations/supabase/client";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StepBlocksEditor, hasLegacyContent } from "@/components/admin/StepBlocksEditor";
import { StepHistoryCard } from "@/components/admin/EntityEditPanels";
import { contentStatusOptions, stepTypeOptions } from "@/components/admin/ContentCreateDialogs";
import { submitStepSuggestion } from "@/lib/admin.queries";
import { SignoffChecklistEditor, serializeChecklist } from "@/components/admin/SignoffChecklistEditor";
import { parseSignoffChecklist, stepTypeLabels, trainerSignoffTypes } from "@/lib/training.queries";
import type {
  ContentStatus,
  SignoffChecklistItem,
  StepRow,
  StepType,
} from "@/lib/training.queries";

interface Draft {
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

function draftFromStep(step: StepRow): Draft {
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

/**
 * Condensed step editor for standalone/assignable modules: title, type and the block
 * editor up front, everything curation-related tucked under Advanced settings.
 * Same mutations and permission gating as StepEditPanel — presentation only.
 */
export function StandaloneStepEditor({
  step,
  canEditDirect,
  canSuggest,
  employeeId,
}: {
  step: StepRow;
  canEditDirect: boolean;
  canSuggest: boolean;
  employeeId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftFromStep(step));
  const [suggestionWhy, setSuggestionWhy] = useState("");
  // Pending block payload edits, saved together with the step fields by this editor's Save.
  const [blockDrafts, setBlockDrafts] = useState<Record<string, BlockPayload>>({});
  useEffect(() => {
    setDraft(draftFromStep(step));
    setBlockDrafts({});
  }, [step.id, step.updated_at]);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

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

      const blockEntries = Object.entries(blockDrafts);
      for (const [id, payload] of blockEntries) {
        const { error: blockError } = await supabase
          .from("step_blocks")
          .update({ payload: payload as never })
          .eq("id", id);
        if (blockError) throw blockError;
      }
      return blockEntries.length;
    },
    onSuccess: (blockCount) => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["step-blocks", step.id] });
      setBlockDrafts({});
      toast.success(
        blockCount === 0
          ? "Saved"
          : `Saved — ${blockCount} ${blockCount === 1 ? "block" : "blocks"} updated`,
      );
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
    },
    onError: (error: Error) => toast.error("Couldn't submit", { description: error.message }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <div className="space-y-2">
          <Label htmlFor={`title-${step.id}`}>Title</Label>
          <Input
            id={`title-${step.id}`}
            value={draft.title}
            maxLength={140}
            disabled={!canEditDirect && !canSuggest}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`type-${step.id}`}>Step type</Label>
          <Select
            value={draft.step_type}
            disabled={!canEditDirect}
            onValueChange={(v) => patch({ step_type: v as StepType })}
          >
            <SelectTrigger id={`type-${step.id}`}>
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
      </div>

      {step.is_deleted ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}

      {blockFirst ? null : (
        <>
          <div className="space-y-2">
            <Label htmlFor={`body-${step.id}`}>Content body</Label>
            <FormattingTextarea
              id={`body-${step.id}`}
              rows={6}
              value={draft.content_body}
              maxLength={4000}
              disabled={!canEditDirect && !canSuggest}
              onChange={(e) => patch({ content_body: e.target.value })}
              placeholder="One numbered step per line."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`video-${step.id}`}>Video link (YouTube)</Label>
            <Input
              id={`video-${step.id}`}
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
            helpText="Shown above the step's written content."
            disabled={!canEditDirect}
          />
        </>
      )}

      {canSuggest && !blockFirst ? (
        <div className="space-y-2">
          <Label htmlFor={`why-${step.id}`}>How do you know it should change?</Label>
          <Textarea
            id={`why-${step.id}`}
            rows={3}
            value={suggestionWhy}
            maxLength={1000}
            onChange={(e) => setSuggestionWhy(e.target.value)}
            placeholder="What you'd check before you'd sign off on it."
          />
        </div>
      ) : null}

      {canEditDirect && trainerSignoffTypes.includes(draft.step_type) ? (
        <SignoffChecklistEditor
          items={draft.signoff_checklist}
          disabled={!canEditDirect}
          onChange={(signoff_checklist) => patch({ signoff_checklist })}
        />
      ) : null}

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

      <Collapsible defaultOpen={false}>
        <Card>
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left">
            <CardHeader className="flex-1">
              <CardTitle className="text-base">Advanced settings</CardTitle>
            </CardHeader>
            <ChevronDown
              className="mr-6 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5">
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor={`status-${step.id}`}>Content status</Label>
                <Select
                  value={draft.content_status}
                  disabled={!canEditDirect}
                  onValueChange={(v) => patch({ content_status: v as ContentStatus })}
                >
                  <SelectTrigger id={`status-${step.id}`}>
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

              <div className="space-y-2">
                <Label htmlFor={`notes-${step.id}`}>Content notes (admin-only)</Label>
                <Textarea
                  id={`notes-${step.id}`}
                  rows={3}
                  value={draft.content_notes}
                  maxLength={1000}
                  disabled={!canEditDirect}
                  onChange={(e) => patch({ content_notes: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`card-override-${step.id}`}>Intro card override (optional)</Label>
                  <Textarea
                    id={`card-override-${step.id}`}
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
                    id={`hide-card-${step.id}`}
                    checked={draft.hide_module_card}
                    disabled={!canEditDirect}
                    onCheckedChange={(v) => patch({ hide_module_card: v === true })}
                  />
                  <Label htmlFor={`hide-card-${step.id}`} className="font-normal">
                    Hide the module intro card on this step
                  </Label>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`media-rec-${step.id}`} className="text-xs text-muted-foreground">
                    Media recommendation
                  </Label>
                  <Select
                    value={draft.media_recommendation}
                    disabled={!canEditDirect}
                    onValueChange={(v) =>
                      patch({ media_recommendation: v as Draft["media_recommendation"] })
                    }
                  >
                    <SelectTrigger id={`media-rec-${step.id}`} className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor={`loc-${step.id}`}>Location tag</Label>
                <Input
                  id={`loc-${step.id}`}
                  value={draft.location_tag}
                  maxLength={60}
                  disabled={!canEditDirect}
                  onChange={(e) => patch({ location_tag: e.target.value })}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                  The step is hidden from trainees and logged with who, when, and what. It is never
                  permanently deleted and can be restored at any time.
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

      <StepHistoryCard step={step} canEditDirect={canEditDirect} />
    </div>
  );
}
