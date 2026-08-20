import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { moduleCategoryOptionsQueryOptions } from "@/lib/admin.queries";
import {
  stepTypeLabels,
  branchOptionsQueryOptions,
  type ContentStatus,
  type Department,
  type StepType,
} from "@/lib/training.queries";

export const stepTypeOptions: StepType[] = [
  "text",
  "photo",
  "video",
  "quiz",
  "doing_signoff",
  "supervised_live_practice",
];
export const contentStatusOptions: ContentStatus[] = [
  "ready",
  "needs_restructuring",
  "missing",
  "blocked",
];
const departmentOptions: Department[] = ["universal", "market", "kitchen", "delivery"];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Shared shell: dialog + create mutation + content-tree invalidation. */
function CreateDialog({
  title,
  description,
  trigger,
  disabled,
  children,
  onSubmit,
  onCreated,
  reset,
  successMessage,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  disabled?: boolean | undefined;
  children: ReactNode;
  onSubmit: () => Promise<string>;
  onCreated: (id: string) => void;
  reset: () => void;
  successMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: onSubmit,
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
      onCreated(id);
      setOpen(false);
      reset();
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error("Couldn't create", { description: error.message }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter>
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewTrackDialog({
  disabled,
  onCreated,
}: {
  disabled?: boolean | undefined;
  onCreated: (trackId: string) => void;
}) {
  const empty = {
    name: "",
    slug: "",
    slugTouched: false,
    department: "kitchen" as Department,
    description: "",
    sequence_order: "1",
  };
  const [form, setForm] = useState(empty);
  const patch = (p: Partial<typeof empty>) => setForm((f) => ({ ...f, ...p }));

  return (
    <CreateDialog
      title="New track"
      description="Tracks are the top level — Universal, Market, Kitchen, Delivery."
      successMessage="Track created."
      disabled={disabled}
      trigger={
        <Button size="sm" variant="outline" className="w-full">
          New track
        </Button>
      }
      reset={() => setForm(empty)}
      onCreated={onCreated}
      onSubmit={async () => {
        const { data, error } = await supabase
          .from("tracks")
          .insert({
            name: form.name.trim(),
            slug: (form.slug.trim() || slugify(form.name)) as string,
            department: form.department,
            description: form.description.trim() || null,
            sequence_order: Number(form.sequence_order) || 1,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="track-name">Name</Label>
        <Input
          id="track-name"
          value={form.name}
          maxLength={120}
          onChange={(e) =>
            patch({
              name: e.target.value,
              ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }),
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="track-slug">Slug</Label>
        <Input
          id="track-slug"
          value={form.slug}
          maxLength={60}
          onChange={(e) => patch({ slug: e.target.value, slugTouched: true })}
        />
      </div>
      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={form.department} onValueChange={(v) => patch({ department: v as Department })}>
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
      <div className="space-y-2">
        <Label htmlFor="track-desc">Description</Label>
        <Textarea
          id="track-desc"
          rows={3}
          value={form.description}
          maxLength={1000}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="track-seq">Sequence order</Label>
        <Input
          id="track-seq"
          type="number"
          value={form.sequence_order}
          onChange={(e) => patch({ sequence_order: e.target.value })}
        />
      </div>
    </CreateDialog>
  );
}

export function NewModuleDialog({
  trackId,
  department,
  nextSequence,
  disabled,
  defaultIsAssignable = false,
  defaultCategory = "",
  trigger,
  onCreated,
}: {
  trackId: string;
  department: Department | null;
  nextSequence: number;
  disabled?: boolean | undefined;
  /** Contextual creation (Assign Training page) pre-checks "assignable". */
  defaultIsAssignable?: boolean;
  /** Contextual creation pre-selects the category section it was launched from. */
  defaultCategory?: string;
  /** Optional custom trigger; defaults to the "+ Module" ghost button. */
  trigger?: ReactNode;
  onCreated: (moduleId: string) => void;
}) {
  const empty = {
    name: "",
    slug: "",
    slugTouched: false,
    description: "",
    sub_path: "",
    day_assignment: "",
    sequence_order: String(nextSequence),
    is_assignable: defaultIsAssignable,
    category: defaultCategory,
    location_tag: "",
  };
  const [form, setForm] = useState(empty);
  const patch = (p: Partial<typeof empty>) => setForm((f) => ({ ...f, ...p }));
  const [subPathIsCustom, setSubPathIsCustom] = useState(false);
  const [categoryIsCustom, setCategoryIsCustom] = useState(false);
  const branchQuery = useQuery({
    ...branchOptionsQueryOptions(department ?? null),
    enabled: !!department,
  });
  const branchChoices = Array.from(new Set(branchQuery.data ?? [])).sort();
  const categoryQuery = useQuery({
    ...moduleCategoryOptionsQueryOptions(department ?? null),
    enabled: !!department,
  });
  const categoryChoices = Array.from(
    new Set([...(categoryQuery.data ?? []), ...(defaultCategory ? [defaultCategory] : [])]),
  ).sort();

  return (
    <CreateDialog
      title="New module"
      description="Modules group steps inside a track."
      successMessage="Module created."
      disabled={disabled}
      trigger={
        trigger ?? (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
          + Module
        </Button>
        )
      }
      reset={() => {
        setForm({ ...empty, sequence_order: String(nextSequence) });
        setSubPathIsCustom(false);
        setCategoryIsCustom(false);
      }}
      onCreated={onCreated}
      onSubmit={async () => {
        const { data, error } = await supabase
          .from("modules")
          .insert({
            track_id: trackId,
            name: form.name.trim(),
            slug: form.slug.trim() || slugify(form.name),
            description: form.description.trim() || null,
            sub_path: form.sub_path.trim() || null,
            day_assignment: form.day_assignment ? Number(form.day_assignment) : null,
            sequence_order: Number(form.sequence_order) || nextSequence,
            is_assignable: form.is_assignable,
            category: form.is_assignable ? form.category.trim() || null : null,
            location_tag: form.location_tag.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="module-name">Name</Label>
        <Input
          id="module-name"
          value={form.name}
          maxLength={140}
          onChange={(e) =>
            patch({
              name: e.target.value,
              ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }),
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-slug">Slug</Label>
        <Input
          id="module-slug"
          value={form.slug}
          maxLength={60}
          onChange={(e) => patch({ slug: e.target.value, slugTouched: true })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-desc">Description</Label>
        <Textarea
          id="module-desc"
          rows={3}
          value={form.description}
          maxLength={1000}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="module-subpath">Sub-path</Label>
          <Select
            value={subPathIsCustom ? "__custom__" : form.sub_path || "__none__"}
            onValueChange={(v) => {
              if (v === "__custom__") {
                setSubPathIsCustom(true);
                return;
              }
              setSubPathIsCustom(false);
              patch({ sub_path: v === "__none__" ? "" : v });
            }}
          >
            <SelectTrigger id="module-subpath">
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
          {subPathIsCustom ? (
            <Input
              aria-label="Custom branch name"
              placeholder="New branch name"
              value={form.sub_path}
              maxLength={60}
              onChange={(e) => patch({ sub_path: e.target.value })}
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-day">Day assignment</Label>
          <Input
            id="module-day"
            type="number"
            value={form.day_assignment}
            onChange={(e) => patch({ day_assignment: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-seq">Sequence order</Label>
          <Input
            id="module-seq"
            type="number"
            value={form.sequence_order}
            onChange={(e) => patch({ sequence_order: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-loc">Location tag</Label>
          <Input
            id="module-loc"
            value={form.location_tag}
            maxLength={60}
            onChange={(e) => patch({ location_tag: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="module-assignable"
          checked={form.is_assignable}
          onCheckedChange={(v) => patch({ is_assignable: v === true })}
        />
        <Label htmlFor="module-assignable" className="font-normal">
          Assignable module (restricted / assigned individually)
        </Label>
      </div>
      {form.is_assignable ? (
        <div className="space-y-2 sm:max-w-sm">
          <Label htmlFor="module-category">Category</Label>
          <Select
            value={categoryIsCustom ? "__custom__" : form.category || "__none__"}
            onValueChange={(v) => {
              if (v === "__custom__") {
                setCategoryIsCustom(true);
                return;
              }
              setCategoryIsCustom(false);
              patch({ category: v === "__none__" ? "" : v });
            }}
          >
            <SelectTrigger id="module-category">
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
              value={form.category}
              maxLength={60}
              onChange={(e) => patch({ category: e.target.value })}
            />
          ) : null}
        </div>
      ) : null}
    </CreateDialog>
  );
}

export function NewStepDialog({
  moduleId,
  nextSequence,
  disabled,
  canEditDirect,
  onCreated,
  trigger,
}: {
  moduleId: string;
  nextSequence: number;
  disabled?: boolean | undefined;
  canEditDirect: boolean;
  onCreated: (stepId: string) => void;
  trigger?: React.ReactNode;
}) {
  const empty = {
    title: "",
    step_type: "text" as StepType,
    content_status: "missing" as ContentStatus,
    content_body: "",
    content_notes: "",
    video_url: "",
    location_tag: "",
    sequence_order: String(nextSequence),
  };
  const [form, setForm] = useState(empty);
  const patch = (p: Partial<typeof empty>) => setForm((f) => ({ ...f, ...p }));

  return (
    <CreateDialog
      title="New step"
      description="Steps are the smallest editable unit."
      successMessage="Step created."
      disabled={disabled}
      trigger={
        trigger ?? (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
            + Step
          </Button>
        )
      }
      reset={() => setForm({ ...empty, sequence_order: String(nextSequence) })}
      onCreated={onCreated}
      onSubmit={async () => {
        const { data, error } = await supabase
          .from("steps")
          .insert({
            module_id: moduleId,
            title: form.title.trim(),
            step_type: form.step_type,
            content_status: form.content_status,
            content_body: form.content_body.trim() || null,
            content_notes: form.content_notes.trim() || null,
            video_url: form.video_url.trim() || null,
            location_tag: form.location_tag.trim() || null,
            sequence_order: Number(form.sequence_order) || nextSequence,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="step-title">Title</Label>
        <Input
          id="step-title"
          value={form.title}
          maxLength={140}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Step type</Label>
          <Select value={form.step_type} onValueChange={(v) => patch({ step_type: v as StepType })}>
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
            value={form.content_status}
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
      {canEditDirect ? (
        <p className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
          Add content as blocks after creating this step.
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="step-body">Content body</Label>
          <Textarea
            id="step-body"
            rows={5}
            value={form.content_body}
            maxLength={4000}
            placeholder="One numbered step per line."
            onChange={(e) => patch({ content_body: e.target.value })}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="step-notes">Content notes (admin-only)</Label>
        <Textarea
          id="step-notes"
          rows={3}
          value={form.content_notes}
          maxLength={1000}
          onChange={(e) => patch({ content_notes: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {canEditDirect ? null : (
          <div className="space-y-2">
            <Label htmlFor="step-video">Video link (YouTube)</Label>
            <Input
              id="step-video"
              value={form.video_url}
              maxLength={300}
              onChange={(e) => patch({ video_url: e.target.value })}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="step-loc">Location tag</Label>
          <Input
            id="step-loc"
            value={form.location_tag}
            maxLength={60}
            onChange={(e) => patch({ location_tag: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="step-seq">Sequence order</Label>
        <Input
          id="step-seq"
          type="number"
          value={form.sequence_order}
          onChange={(e) => patch({ sequence_order: e.target.value })}
        />
      </div>
    </CreateDialog>
  );
}