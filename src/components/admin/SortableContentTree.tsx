import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { trackTheme } from "@/lib/track-theme";
import type { ModuleRow, StepRow, TrackRow } from "@/lib/training.queries";

type ModuleWithTrack = ModuleRow & { track: TrackRow | undefined };

type Selection = { kind: "step" | "module" | "track"; id: string };

/** Persistently visible grab handle. Muted (no listeners) when not allowed. */
function Handle({
  enabled,
  attributes,
  listeners,
  label,
}: {
  enabled: boolean;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  label: string;
}) {
  if (!enabled) {
    return (
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 cursor-not-allowed items-center justify-center opacity-30"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      {...(attributes as object)}
      {...(listeners as object)}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function SortableRow({
  id,
  enabled,
  handleLabel,
  children,
}: {
  id: string;
  enabled: boolean;
  handleLabel: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 ${isDragging ? "opacity-40" : ""}`}
    >
      <Handle
        enabled={enabled}
        attributes={attributes as unknown as Record<string, unknown>}
        listeners={listeners as unknown as Record<string, unknown>}
        label={handleLabel}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SortableContentTree({
  tracks,
  modules,
  steps,
  selection,
  onSelect,
  canReorderTracks,
  canReorderModulesIn,
  renderTrackLabel,
  renderModuleLabel,
  renderStepLabel,
  renderModuleChildren,
  renderTrackFooter,
}: {
  tracks: TrackRow[];
  modules: ModuleWithTrack[];
  steps: StepRow[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  canReorderTracks: boolean;
  canReorderModulesIn: (track: TrackRow) => boolean;
  renderTrackLabel: (track: TrackRow) => ReactNode;
  renderModuleLabel: (m: ModuleWithTrack) => ReactNode;
  renderStepLabel: (s: StepRow) => ReactNode;
  renderModuleChildren: (m: ModuleWithTrack, track: TrackRow) => ReactNode;
  renderTrackFooter: (track: TrackRow) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const [trackOrder, setTrackOrder] = useState<string[]>([]);
  const [moduleOrder, setModuleOrder] = useState<Record<string, string[]>>({});
  const [stepOrder, setStepOrder] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Server order is the source of truth; local copies only exist so a drop can
  // reflow instantly and be reverted if the database rejects it.
  const serverTrackOrder = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const serverModuleOrder = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of tracks) map[t.id] = [];
    for (const m of modules) (map[m.track_id] ??= []).push(m.id);
    return map;
  }, [tracks, modules]);
  const serverStepOrder = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of modules) map[m.id] = [];
    for (const s of steps) (map[s.module_id] ??= []).push(s.id);
    return map;
  }, [modules, steps]);

  useEffect(() => {
    if (!saving) setTrackOrder(serverTrackOrder);
  }, [serverTrackOrder, saving]);
  useEffect(() => {
    if (!saving) setModuleOrder(serverModuleOrder);
  }, [serverModuleOrder, saving]);
  useEffect(() => {
    if (!saving) setStepOrder(serverStepOrder);
  }, [serverStepOrder, saving]);

  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const moduleById = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);
  const stepById = useMemo(() => new Map(steps.map((s) => [s.id, s])), [steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const revert = () => {
    setTrackOrder(serverTrackOrder);
    setModuleOrder(serverModuleOrder);
    setStepOrder(serverStepOrder);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
    void queryClient.invalidateQueries({ queryKey: ["module"] });
  };

  const persist = async (
    updates: {
      table: "tracks" | "modules" | "steps";
      id: string;
      values: Record<string, unknown>;
    }[],
  ) => {
    setSaving(true);
    try {
      for (const u of updates) {
        const { error } = await supabase
          .from(u.table)
          .update(u.values as never)
          .eq("id", u.id);
        if (error) throw error;
      }
      toast.success("Order saved — previous version logged to history.");
      refresh();
    } catch (error) {
      revert();
      toast.error("Couldn't reorder", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const activeIsTrack = activeId?.startsWith("t-") ?? false;
  const activeModule = activeId?.startsWith("m-") ? moduleById.get(activeId.slice(2)) : undefined;
  const activeStep = activeId?.startsWith("s-") ? stepById.get(activeId.slice(2)) : undefined;

  const trackAcceptsActiveModule = (track: TrackRow) =>
    !activeModule || (canReorderModulesIn(track) && !!activeModule.track && canReorderModulesIn(activeModule.track));

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (activeKey === overKey) return;

    // ---- Step reorder (same module only) ----
    if (activeKey.startsWith("s-")) {
      const movedStepId = activeKey.slice(2);
      const movedStep = stepById.get(movedStepId);
      if (!movedStep) return;
      const parentModule = moduleById.get(movedStep.module_id);
      const parentTrack = parentModule?.track;
      if (!parentModule || !parentTrack || !canReorderModulesIn(parentTrack)) {
        toast.error("Couldn't reorder", {
          description: "That module is outside your department.",
        });
        return;
      }
      // Resolve the drop target to a module; anything outside this module is a no-op.
      const overModuleId = overKey.startsWith("s-")
        ? stepById.get(overKey.slice(2))?.module_id
        : overKey.startsWith("m-")
          ? overKey.slice(2)
          : undefined;
      if (overModuleId !== parentModule.id) return;

      const list = [...(stepOrder[parentModule.id] ?? [])];
      const from = list.indexOf(movedStepId);
      const to = overKey.startsWith("s-") ? list.indexOf(overKey.slice(2)) : list.length - 1;
      if (from < 0 || to < 0) return;
      list.splice(to, 0, list.splice(from, 1)[0]!);
      setStepOrder({ ...stepOrder, [parentModule.id]: list });
      void persist(
        list.map((id, i) => ({ table: "steps" as const, id, values: { sequence_order: i + 1 } })),
      );
      return;
    }

    // ---- Track reorder ----
    if (activeKey.startsWith("t-")) {
      if (!canReorderTracks) return;
      const from = trackOrder.indexOf(activeKey.slice(2));
      const overTrackId = overKey.startsWith("t-")
        ? overKey.slice(2)
        : moduleById.get(overKey.slice(2))?.track_id;
      const to = overTrackId ? trackOrder.indexOf(overTrackId) : -1;
      if (from < 0 || to < 0) return;
      const next = [...trackOrder];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      setTrackOrder(next);
      void persist(
        next.map((id, i) => ({ table: "tracks" as const, id, values: { sequence_order: i + 1 } })),
      );
      return;
    }

    // ---- Module reorder / cross-track move ----
    const movedId = activeKey.slice(2);
    const moved = moduleById.get(movedId);
    if (!moved) return;
    const sourceTrackId = moved.track_id;
    const destTrackId = overKey.startsWith("t-")
      ? overKey.slice(2)
      : moduleById.get(overKey.slice(2))?.track_id;
    if (!destTrackId) return;
    const sourceTrack = trackById.get(sourceTrackId);
    const destTrack = trackById.get(destTrackId);
    if (!sourceTrack || !destTrack) return;
    if (!canReorderModulesIn(sourceTrack) || !canReorderModulesIn(destTrack)) {
      toast.error("Couldn't reorder", {
        description: "That track is outside your department.",
      });
      return;
    }

    const nextMap: Record<string, string[]> = Object.fromEntries(
      Object.entries(moduleOrder).map(([k, v]) => [k, [...v]]),
    );
    const sourceList = nextMap[sourceTrackId] ?? [];
    sourceList.splice(sourceList.indexOf(movedId), 1);
    nextMap[sourceTrackId] = sourceList;
    const destList = nextMap[destTrackId] ?? [];
    const overIndex = overKey.startsWith("m-") ? destList.indexOf(overKey.slice(2)) : destList.length;
    destList.splice(overIndex < 0 ? destList.length : overIndex, 0, movedId);
    nextMap[destTrackId] = destList;
    setModuleOrder(nextMap);

    const updates = destList.map((id, i) => ({
      table: "modules" as const,
      id,
      values:
        id === movedId && sourceTrackId !== destTrackId
          ? { sequence_order: i + 1, track_id: destTrackId }
          : { sequence_order: i + 1 },
    }));
    void persist(updates);
  };

  const orderedTracks = trackOrder
    .map((id) => trackById.get(id))
    .filter((t): t is TrackRow => Boolean(t));

  const overlayLabel = activeIsTrack
    ? trackById.get(activeId!.slice(2))?.name
    : (activeModule?.name ?? activeStep?.title);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={orderedTracks.map((t) => `t-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-5">
          {orderedTracks.map((track) => {
            const trackModules = (moduleOrder[track.id] ?? [])
              .map((id) => moduleById.get(id))
              .filter((m): m is ModuleWithTrack => Boolean(m));
            const blocked = Boolean(activeModule) && !trackAcceptsActiveModule(track);
            return (
              <div
                key={track.id}
                className={blocked ? "cursor-not-allowed opacity-40" : undefined}
              >
                <SortableRow
                  id={`t-${track.id}`}
                  enabled={canReorderTracks}
                  handleLabel={`Reorder track ${track.name}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect({ kind: "track", id: track.id })}
                    className={`mb-2 w-full rounded px-2 py-1 text-left text-xs font-medium uppercase tracking-wide transition-colors hover:bg-muted ${
                      selection.kind === "track" && selection.id === track.id
                        ? "bg-muted text-foreground"
                        : trackTheme(track.name).label
                    }`}
                  >
                    {renderTrackLabel(track)}
                  </button>
                </SortableRow>
                <div className="space-y-3">
                  <SortableContext
                    items={trackModules.map((m) => `m-${m.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {trackModules.map((m) => (
                      <div key={m.id}>
                        <SortableRow
                          id={`m-${m.id}`}
                          enabled={canReorderModulesIn(track)}
                          handleLabel={`Reorder module ${m.name}`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect({ kind: "module", id: m.id })}
                            className={`w-full rounded px-2 py-1 text-left text-sm font-medium transition-colors hover:bg-muted ${
                              selection.kind === "module" && selection.id === m.id ? "bg-muted" : ""
                            }`}
                          >
                            {renderModuleLabel(m)}
                          </button>
                        </SortableRow>
                        <ul className="ml-7 mt-1 space-y-0.5 border-l border-border pl-3">
                          <SortableContext
                            items={(stepOrder[m.id] ?? []).map((id) => `s-${id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {(stepOrder[m.id] ?? [])
                              .map((id) => stepById.get(id))
                              .filter((s): s is StepRow => Boolean(s))
                              .map((s) => (
                                <li key={s.id}>
                                  <SortableRow
                                    id={`s-${s.id}`}
                                    enabled={canReorderModulesIn(track)}
                                    handleLabel={`Reorder step ${s.title}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => onSelect({ kind: "step", id: s.id })}
                                      className={`w-full rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted ${
                                        selection.kind === "step" && selection.id === s.id
                                          ? "bg-muted font-medium"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {renderStepLabel(s)}
                                    </button>
                                  </SortableRow>
                                </li>
                              ))}
                          </SortableContext>
                          <li>{renderModuleChildren(m, track)}</li>
                        </ul>
                      </div>
                    ))}
                  </SortableContext>
                  {renderTrackFooter(track)}
                </div>
              </div>
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-sm font-medium shadow-lg">
            <GripVertical className="size-4 text-muted-foreground" />
            <span className="truncate">{overlayLabel}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}