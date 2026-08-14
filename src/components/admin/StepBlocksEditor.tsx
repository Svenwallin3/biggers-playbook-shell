import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormattingTextarea } from "@/components/ui/formatting-textarea";
import { PhotoUpload } from "@/components/PhotoUpload";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const blockTypes = [
  "heading",
  "paragraph",
  "list",
  "photo",
  "gallery",
  "video",
  "label_value",
  "danger_zone",
] as const;

export type BlockType = (typeof blockTypes)[number];

export const blockTypeLabels: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  photo: "Photo",
  gallery: "Photo gallery",
  video: "Video",
  label_value: "Label / value pairs",
  danger_zone: "Danger-zone graphic",
};

type BlockRow = {
  id: string;
  step_id: string;
  block_type: string;
  payload: Json;
  sequence_order: number;
  is_deleted: boolean;
};

type Payload = Record<string, unknown>;

function emptyPayload(type: BlockType): Payload {
  switch (type) {
    case "heading":
      return { text: "", level: "h2" };
    case "paragraph":
      return { text: "" };
    case "list":
      return { style: "numbered", items: [""] };
    case "photo":
      return { path: "", caption: "" };
    case "gallery":
      return { photos: [{ path: "", caption: "" }] };
    case "video":
      return { url: "", caption: "" };
    case "label_value":
      return { pairs: [{ label: "", value: "" }] };
    case "danger_zone":
    default:
      return {};
  }
}

function asPayload(value: unknown): Payload {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Payload) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str) : [];
}

/** Shared add / remove / move row controls. */
function RowControls({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0}>
        <ArrowUp className="size-4" />
        <span className="sr-only">Move up</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onMove(1)}
        disabled={index === length - 1}
      >
        <ArrowDown className="size-4" />
        <span className="sr-only">Move down</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="size-4 text-destructive" />
        <span className="sr-only">Remove</span>
      </Button>
    </>
  );
}

function moveIn<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row!);
  return next;
}

function BlockPayloadEditor({
  type,
  payload,
  onChange,
}: {
  type: BlockType;
  payload: Payload;
  onChange: (next: Payload) => void;
}) {
  const set = (patch: Payload) => onChange({ ...payload, ...patch });

  if (type === "heading") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={str(payload["text"])}
          maxLength={200}
          placeholder="Heading text"
          onChange={(e) => set({ text: e.target.value })}
        />
        <Select
          value={payload["level"] === "h3" ? "h3" : "h2"}
          onValueChange={(v) => set({ level: v })}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h2">Main (h2)</SelectItem>
            <SelectItem value="h3">Sub (h3)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "paragraph") {
    return (
      <FormattingTextarea
        rows={4}
        maxLength={4000}
        value={str(payload["text"])}
        placeholder="Paragraph text"
        onChange={(e) => set({ text: e.target.value })}
      />
    );
  }

  if (type === "list") {
    const items = strList(payload["items"]);
    return (
      <div className="space-y-2">
        <Select
          value={payload["style"] === "bulleted" ? "bulleted" : "numbered"}
          onValueChange={(v) => set({ style: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="numbered">Numbered</SelectItem>
            <SelectItem value="bulleted">Bulleted</SelectItem>
          </SelectContent>
        </Select>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
            <Input
              value={item}
              placeholder="List item — **bold**, *italic*, __underline__"
              onChange={(e) =>
                set({ items: items.map((v, idx) => (idx === i ? e.target.value : v)) })
              }
            />
            <RowControls
              index={i}
              length={items.length}
              onMove={(d) => set({ items: moveIn(items, i, d) })}
              onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set({ items: [...items, ""] })}>
          <Plus className="size-4" />
          Add item
        </Button>
      </div>
    );
  }

  if (type === "photo") {
    return (
      <div className="space-y-2">
        <PhotoUpload
          value={str(payload["path"]) || null}
          onChange={(value) => set({ path: value ?? "" })}
          folder="steps"
          label="Photo"
        />
        <Input
          value={str(payload["caption"])}
          maxLength={200}
          placeholder="Caption (optional)"
          onChange={(e) => set({ caption: e.target.value })}
        />
      </div>
    );
  }

  if (type === "gallery") {
    const photos = (Array.isArray(payload["photos"]) ? payload["photos"] : []).map((entry) => {
      const record = asPayload(entry);
      return { path: str(record["path"]), caption: str(record["caption"]) };
    });
    const setPhotos = (next: typeof photos) => set({ photos: next });
    return (
      <div className="space-y-3">
        {photos.map((photo, i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Photo {i + 1}</span>
              <div className="flex items-center">
                <RowControls
                  index={i}
                  length={photos.length}
                  onMove={(d) => setPhotos(moveIn(photos, i, d))}
                  onRemove={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>
            <PhotoUpload
              value={photo.path || null}
              onChange={(value) =>
                setPhotos(photos.map((p, idx) => (idx === i ? { ...p, path: value ?? "" } : p)))
              }
              folder="steps"
              label="Photo"
            />
            <Input
              className="mt-2"
              value={photo.caption}
              maxLength={200}
              placeholder="Caption (optional)"
              onChange={(e) =>
                setPhotos(photos.map((p, idx) => (idx === i ? { ...p, caption: e.target.value } : p)))
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPhotos([...photos, { path: "", caption: "" }])}
        >
          <Plus className="size-4" />
          Add photo
        </Button>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="space-y-2">
        <Input
          value={str(payload["url"])}
          maxLength={300}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(e) => set({ url: e.target.value })}
        />
        <Input
          value={str(payload["caption"])}
          maxLength={200}
          placeholder="Caption (optional)"
          onChange={(e) => set({ caption: e.target.value })}
        />
      </div>
    );
  }

  if (type === "label_value") {
    const pairs = (Array.isArray(payload["pairs"]) ? payload["pairs"] : []).map((entry) => {
      const record = asPayload(entry);
      return { label: str(record["label"]), value: str(record["value"]) };
    });
    const setPairs = (next: typeof pairs) => set({ pairs: next });
    return (
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <Input
              className="sm:w-44"
              value={pair.label}
              maxLength={120}
              placeholder="Label"
              onChange={(e) =>
                setPairs(pairs.map((p, idx) => (idx === i ? { ...p, label: e.target.value } : p)))
              }
            />
            <Input
              value={pair.value}
              maxLength={400}
              placeholder="Value"
              onChange={(e) =>
                setPairs(pairs.map((p, idx) => (idx === i ? { ...p, value: e.target.value } : p)))
              }
            />
            <div className="flex items-center">
              <RowControls
                index={i}
                length={pairs.length}
                onMove={(d) => setPairs(moveIn(pairs, i, d))}
                onRemove={() => setPairs(pairs.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPairs([...pairs, { label: "", value: "" }])}
        >
          <Plus className="size-4" />
          Add pair
        </Button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Renders the fixed temperature danger-zone graphic (41°F – 135°F). Nothing to configure.
    </p>
  );
}

function BlockCard({
  block,
  index,
  total,
  busy,
  onSave,
  onMove,
  onDuplicate,
  onHide,
  onRestore,
}: {
  block: BlockRow;
  index: number;
  total: number;
  busy: boolean;
  onSave: (payload: Payload) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onHide: () => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState<Payload>(() => asPayload(block.payload));
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(asPayload(block.payload));
    setDirty(false);
  }, [block.id, JSON.stringify(block.payload)]);

  const type = (blockTypes as readonly string[]).includes(block.block_type)
    ? (block.block_type as BlockType)
    : "paragraph";

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{blockTypeLabels[type]}</Badge>
          {block.is_deleted ? <Badge variant="outline">Hidden</Badge> : null}
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            disabled={busy || block.is_deleted || index <= 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-4" />
            <span className="sr-only">Move block up</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy || block.is_deleted || index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-4" />
            <span className="sr-only">Move block down</span>
          </Button>
          <Button variant="ghost" size="icon" disabled={busy} onClick={onDuplicate}>
            <Copy className="size-4" />
            <span className="sr-only">Duplicate block</span>
          </Button>
          {block.is_deleted ? (
            <Button variant="ghost" size="icon" disabled={busy} onClick={onRestore}>
              <RotateCcw className="size-4" />
              <span className="sr-only">Restore block</span>
            </Button>
          ) : (
            <Button variant="ghost" size="icon" disabled={busy} onClick={onHide}>
              <EyeOff className="size-4 text-destructive" />
              <span className="sr-only">Hide block</span>
            </Button>
          )}
        </div>
      </div>

      <BlockPayloadEditor
        type={type}
        payload={draft}
        onChange={(next) => {
          setDraft(next);
          setDirty(true);
        }}
      />

      {type !== "danger_zone" ? (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" disabled={busy || !dirty} onClick={() => onSave(draft)}>
            Save block
          </Button>
          {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Block authoring for one step. Owners and scoped General Managers only —
 * gated by the caller on the same `canEditDirect` rule the RLS policy uses.
 */
export function StepBlocksEditor({
  stepId,
  employeeId,
}: {
  stepId: string;
  employeeId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);
  const [newType, setNewType] = useState<BlockType>("paragraph");

  const blocksQuery = useQuery({
    queryKey: ["step-blocks", stepId, "admin"],
    queryFn: async (): Promise<BlockRow[]> => {
      const { data, error } = await supabase
        .from("step_blocks")
        .select("id, step_id, block_type, payload, sequence_order, is_deleted")
        .eq("step_id", stepId)
        .order("sequence_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BlockRow[];
    },
  });

  const all = blocksQuery.data ?? [];
  const visible = all.filter((b) => !b.is_deleted);
  const shown = showHidden ? all : visible;

  // Prefix invalidation also refreshes StepRenderer's ["step-blocks", stepId] query.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["step-blocks", stepId] });

  async function renumber(order: BlockRow[]) {
    for (let i = 0; i < order.length; i += 1) {
      const row = order[i]!;
      if (row.sequence_order === i) continue;
      const { error } = await supabase
        .from("step_blocks")
        .update({ sequence_order: i })
        .eq("id", row.id);
      if (error) throw error;
    }
  }

  const mutate = useMutation({
    mutationFn: async (action: () => Promise<void>) => {
      await action();
    },
    onSuccess: () => {
      void refresh();
    },
    onError: (error: Error) => toast.error("Couldn't update blocks", { description: error.message }),
  });

  const run = (action: () => Promise<void>) => mutate.mutate(action);

  const addBlock = () =>
    run(async () => {
      const { error } = await supabase.from("step_blocks").insert({
        step_id: stepId,
        block_type: newType,
        payload: emptyPayload(newType) as Json,
        sequence_order: visible.length,
      });
      if (error) throw error;
      toast.success(`${blockTypeLabels[newType]} block added.`);
    });

  const saveBlock = (block: BlockRow, payload: Payload) =>
    run(async () => {
      const { error } = await supabase
        .from("step_blocks")
        .update({ payload: payload as Json })
        .eq("id", block.id);
      if (error) throw error;
      toast.success("Block saved.");
    });

  const moveBlock = (block: BlockRow, delta: number) =>
    run(async () => {
      const index = visible.findIndex((b) => b.id === block.id);
      const next = moveIn(visible, index, delta);
      if (next === visible) return;
      await renumber(next);
    });

  const duplicateBlock = (block: BlockRow) =>
    run(async () => {
      const index = visible.findIndex((b) => b.id === block.id);
      // Shift everything after the source down one slot, then insert the copy behind it.
      for (const after of visible.slice(index + 1)) {
        const { error } = await supabase
          .from("step_blocks")
          .update({ sequence_order: after.sequence_order + 1 })
          .eq("id", after.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("step_blocks").insert({
        step_id: stepId,
        block_type: block.block_type,
        payload: block.payload,
        sequence_order: index + 1,
      });
      if (error) throw error;
      toast.success("Block duplicated.");
    });

  const hideBlock = (block: BlockRow) =>
    run(async () => {
      const { error } = await supabase
        .from("step_blocks")
        .update({
          is_deleted: true,
          deleted_by: employeeId ?? null,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", block.id);
      if (error) throw error;
      await renumber(visible.filter((b) => b.id !== block.id));
      toast.success("Block hidden — restorable at any time.");
    });

  const restoreBlock = (block: BlockRow) =>
    run(async () => {
      const { error } = await supabase
        .from("step_blocks")
        .update({
          is_deleted: false,
          deleted_by: null,
          deleted_at: null,
          // Its pre-hide slot was reclaimed when the rest renumbered — append at the end.
          sequence_order: visible.length,
        })
        .eq("id", block.id);
      if (error) throw error;
      toast.success("Block restored at the end — use the arrows to move it.");
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Content blocks</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="blocks-show-hidden" className="text-xs text-muted-foreground">
              Show hidden
            </Label>
            <Switch
              id="blocks-show-hidden"
              checked={showHidden}
              onCheckedChange={setShowHidden}
            />
          </div>
        </div>
        <CardDescription>
          Structured content for this step. Blocks render in this order and replace the plain
          content body when present.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocksQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading blocks…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blocks yet — this step still uses the plain content body above.
          </p>
        ) : (
          shown.map((block) => {
            const index = visible.findIndex((b) => b.id === block.id);
            return (
              <BlockCard
                key={block.id}
                block={block}
                index={block.is_deleted ? -1 : index}
                total={visible.length}
                busy={mutate.isPending}
                onSave={(payload) => saveBlock(block, payload)}
                onMove={(delta) => moveBlock(block, delta)}
                onDuplicate={() => duplicateBlock(block)}
                onHide={() => hideBlock(block)}
                onRestore={() => restoreBlock(block)}
              />
            );
          })
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Select value={newType} onValueChange={(v) => setNewType(v as BlockType)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {blockTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {blockTypeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={mutate.isPending} onClick={addBlock}>
            <Plus className="size-4" />
            Add block
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
