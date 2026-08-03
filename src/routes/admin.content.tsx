import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import {
  contentStatusOptions,
  mockVersionHistory,
  stepTypeOptions,
} from "@/data/mockSuggestions";
import { modules, steps, stepTypeLabels, type ContentStatus, type StepType } from "@/data/mockTraining";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";

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
  hidden: boolean;
}

function draftFor(stepId: string): Draft {
  const s = steps.find((x) => x.id === stepId)!;
  return {
    title: s.title,
    step_type: s.step_type,
    content_status: s.content_status,
    content_body: (s.body ?? []).join("\n"),
    content_notes: s.content_notes ?? "",
    location_tag: s.location_tag,
    hidden: false,
  };
}

function ContentEditorPage() {
  const [selectedId, setSelectedId] = useState(steps[0]!.id);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const draft = drafts[selectedId] ?? draftFor(selectedId);
  const setDraft = (patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [selectedId]: { ...draft, ...patch } }));

  const history = useMemo(
    () => mockVersionHistory.filter((v) => v.stepId === selectedId),
    [selectedId],
  );

  const tracks = useMemo(() => {
    const byTrack = new Map<string, typeof modules>();
    for (const m of modules) {
      byTrack.set(m.trackLabel, [...(byTrack.get(m.trackLabel) ?? []), m]);
    }
    return [...byTrack.entries()];
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content editor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Steps are the smallest editable unit — editing one never changes another. Deletes are soft
          and fully restorable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-5">
          {tracks.map(([trackLabel, mods]) => (
            <div key={trackLabel}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {trackLabel}
              </p>
              <div className="space-y-3">
                {mods.map((m) => (
                  <div key={m.id}>
                    <p className="text-sm font-medium">{m.title}</p>
                    <ul className="mt-1 space-y-0.5 border-l border-border pl-3">
                      {steps
                        .filter((s) => s.moduleId === m.id)
                        .map((s) => {
                          const d = drafts[s.id];
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(s.id)}
                                className={`w-full rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted ${
                                  selectedId === s.id ? "bg-muted font-medium" : "text-muted-foreground"
                                }`}
                              >
                                <span className={d?.hidden ? "line-through" : undefined}>
                                  {d?.title ?? s.title}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Edit step</CardTitle>
                <StepStatusBadge status={draft.content_status} />
                {draft.hidden ? <Badge variant="outline">Hidden (soft-deleted)</Badge> : null}
              </div>
              <CardDescription>Step ID {selectedId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  maxLength={140}
                  onChange={(e) => setDraft({ title: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Step type</Label>
                  <Select
                    value={draft.step_type}
                    onValueChange={(v) => setDraft({ step_type: v as StepType })}
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
                    onValueChange={(v) => setDraft({ content_status: v as ContentStatus })}
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
                  onChange={(e) => setDraft({ content_body: e.target.value })}
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
                  onChange={(e) => setDraft({ content_notes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loc">Location tag</Label>
                <Input
                  id="loc"
                  value={draft.location_tag}
                  maxLength={60}
                  onChange={(e) => setDraft({ location_tag: e.target.value })}
                />
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => toast.success("Saved — queued for Owner approval.")}>
                  Save changes
                </Button>
                {draft.hidden ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft({ hidden: false });
                      toast.success("Step restored.");
                    }}
                  >
                    Restore step
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Soft-delete step</Button>
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
                        <AlertDialogAction
                          onClick={() => {
                            setDraft({ hidden: true });
                            toast.success("Step hidden — logged and restorable.");
                          }}
                        >
                          Hide step
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
              <CardDescription>Placeholder — wired to real history in a later stage.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded edits for this step yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((v) => (
                    <li key={v.id} className="text-sm">
                      <p className="font-medium">{v.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.editedBy} · {v.editedOn}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}