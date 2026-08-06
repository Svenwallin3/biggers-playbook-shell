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
import { supabase } from "@/integrations/supabase/client";
import { versionHistoryQueryOptions } from "@/lib/admin.queries";
import type { Department, ModuleRow, TrackRow } from "@/lib/training.queries";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version history</CardTitle>
        <CardDescription>Every edit is captured — nothing is overwritten silently.</CardDescription>
      </CardHeader>
      <CardContent>
        {historyQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : !historyQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">No recorded edits for this {label} yet.</p>
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
    </Card>
  );
}

function DeleteControls({
  isDeleted,
  label,
  canEdit,
  pending,
  onToggle,
}: {
  isDeleted: boolean;
  label: string;
  canEdit: boolean;
  pending: boolean;
  onToggle: (hidden: boolean) => void;
}) {
  if (isDeleted) {
    return (
      <Button variant="outline" disabled={!canEdit || pending} onClick={() => onToggle(false)}>
        Restore {label}
      </Button>
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
  canEdit,
  employeeId,
}: {
  module: ModuleRow;
  trackName: string | undefined;
  canEdit: boolean;
  employeeId: string | undefined;
}) {
  const empty = {
    name: module.name,
    description: module.description ?? "",
    sub_path: module.sub_path ?? "",
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
      sub_path: module.sub_path ?? "",
      day_assignment: module.day_assignment === null ? "" : String(module.day_assignment),
      sequence_order: String(module.sequence_order),
      location_tag: module.location_tag ?? "",
      is_assignable: module.is_assignable,
    });
  }, [module.id, module.updated_at]);
  const patch = (p: Partial<typeof empty>) => setForm((f) => ({ ...f, ...p }));
  const { save, softDelete } = useEntityMutations("modules", module.id, employeeId);

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
            {!canEdit ? " — read-only: outside your department" : ""}
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
            <Textarea
              id="mod-desc"
              rows={3}
              value={form.description}
              maxLength={1000}
              disabled={!canEdit}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mod-subpath">Sub-path</Label>
              <Input
                id="mod-subpath"
                value={form.sub_path}
                maxLength={60}
                disabled={!canEdit}
                onChange={(e) => patch({ sub_path: e.target.value })}
              />
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

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canEdit || save.isPending}
              onClick={() =>
                save.mutate({
                  name: form.name.trim(),
                  description: form.description.trim() || null,
                  sub_path: form.sub_path.trim() || null,
                  day_assignment: form.day_assignment ? Number(form.day_assignment) : null,
                  sequence_order: Number(form.sequence_order) || module.sequence_order,
                  location_tag: form.location_tag.trim() || null,
                  is_assignable: form.is_assignable,
                })
              }
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            <DeleteControls
              isDeleted={module.is_deleted}
              label="module"
              canEdit={canEdit}
              pending={softDelete.isPending}
              onToggle={(hidden) => softDelete.mutate(hidden)}
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
            {!canEdit ? " — read-only: outside your department" : ""}
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
              <Label>Department</Label>
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