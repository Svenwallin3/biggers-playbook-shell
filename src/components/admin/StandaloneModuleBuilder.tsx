import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { ChevronRight, Eye, GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ModuleEditPanel } from "@/components/admin/EntityEditPanels";
import { StandaloneStepEditor } from "@/components/admin/StandaloneStepEditor";

import { NewStepDialog } from "@/components/admin/ContentCreateDialogs";
import { QuizQuestionsPanel } from "@/components/admin/QuizQuestionsPanel";
import type { ModuleRow, StepRow, TrackRow } from "@/lib/training.queries";

/**
 * Every step in this module, soft-deleted ones included — this builder deliberately
 * surfaces hidden steps so they can be restored in place.
 */
export function allStepsQueryOptions(moduleId: string) {
  return queryOptions({
    queryKey: ["module", moduleId, "all-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("steps")
        .select("*")
        .eq("module_id", moduleId)
        .order("sequence_order");
      if (error) throw error;
      return (data ?? []) as StepRow[];
    },
  });
}

/** One draggable step card. Hidden (soft-deleted) steps are not draggable. */
function SortableStepCard({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  });

  const handle = enabled ? (
    <button
      type="button"
      aria-label="Reorder step"
      className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 cursor-not-allowed items-center justify-center opacity-30"
    >
      <GripVertical className="size-4 text-muted-foreground" />
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
    >
      {children(handle)}
    </div>
  );
}

export function StandaloneModuleBuilder({
  module: mod,
  canEditDirect,
  canSuggest,
  canCreate,
  employeeId,
  deleteRequiresApproval,
  onPreviewAsTrainee,
}: {
  module: ModuleRow & { track?: TrackRow | null };
  canEditDirect: boolean;
  canSuggest: boolean;
  canCreate: boolean;
  employeeId?: string | undefined;
  deleteRequiresApproval: boolean;
  onPreviewAsTrainee: () => void | Promise<void>;
}) {
  const queryClient = useQueryClient();
  const stepsQuery = useQuery(allStepsQueryOptions(mod.id));
  const fetchedSteps = stepsQuery.data ?? [];
  const [previewLoading, setPreviewLoading] = useState(false);

  // Local ordering so a drop feels instant; re-synced whenever the query refetches.
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    setOrder(fetchedSteps.map((s) => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedSteps.map((s) => s.id).join(",")]);

  const steps = order.length
    ? (order.map((id) => fetchedSteps.find((s) => s.id === id)).filter(Boolean) as StepRow[])
    : fetchedSteps;

  // Steps start collapsed — the list reads as a simple outline until one is opened.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allOpen = steps.length > 0 && openIds.length === steps.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = steps.map((s) => s.id);
    const from = list.indexOf(String(active.id));
    const to = list.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    list.splice(to, 0, list.splice(from, 1)[0]!);
    setOrder(list);

    const results = await Promise.all(
      list.map((id, i) =>
        supabase.from("steps").update({ sequence_order: i + 1 }).eq("id", id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Couldn't save the new order", { description: failed.error.message });
    } else {
      toast.success("Step order saved");
    }
    void queryClient.invalidateQueries({ queryKey: ["module", mod.id] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{mod.name}</h1>
          <p className="text-xs text-muted-foreground">
            Standalone module — everything on one page, no step-by-step walk.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={previewLoading}
          onClick={async () => {
            setPreviewLoading(true);
            try {
              await onPreviewAsTrainee();
            } finally {
              setPreviewLoading(false);
            }
          }}
        >
          <Eye className="size-4" aria-hidden="true" />
          {previewLoading ? "Loading…" : "Preview as trainee"}
        </Button>
      </div>


      <ModuleEditPanel
        module={mod}
        trackName={mod.track?.name}
        canEdit={canEditDirect}
        employeeId={employeeId}
        deleteRequiresApproval={deleteRequiresApproval}
        standalone
      />


      {stepsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading steps…</p>
      ) : steps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No steps yet. Add the first one below to start building this module.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {canEditDirect ? (
              <p className="text-xs text-muted-foreground">
                Drag a step by its handle to change the order. Click a step to open it.
              </p>
            ) : (
              <span />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenIds(allOpen ? [] : steps.map((s) => s.id))}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <SortableStepCard
                    key={s.id}
                    id={s.id}
                    enabled={canEditDirect && !s.is_deleted}
                  >
                    {(handle) => (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                            {handle}
                            <button
                              type="button"
                              onClick={() => toggleOpen(s.id)}
                              aria-expanded={openIds.includes(s.id)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <ChevronRight
                                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                                  openIds.includes(s.id) ? "rotate-90" : ""
                                }`}
                                aria-hidden="true"
                              />
                              <span className="text-muted-foreground">Step {i + 1}</span>
                              <span className={s.is_deleted ? "truncate line-through" : "truncate"}>
                                {s.title}
                              </span>
                              {s.is_deleted ? <Badge variant="outline">Hidden</Badge> : null}
                            </button>
                          </CardTitle>
                        </CardHeader>
                        {openIds.includes(s.id) ? (
                          <CardContent className="space-y-6">
                            <StandaloneStepEditor
                              step={s}
                              canEditDirect={canEditDirect}
                              canSuggest={canSuggest}
                              employeeId={employeeId}
                            />

                            {s.step_type === "quiz" ? <QuizQuestionsPanel stepId={s.id} /> : null}
                          </CardContent>
                        ) : null}
                      </Card>
                    )}
                  </SortableStepCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <div className="flex justify-center">
        <NewStepDialog
          moduleId={mod.id}
          nextSequence={steps.length + 1}
          disabled={!canCreate}
          canEditDirect={canEditDirect}
          trigger={<Button size="sm">+ Add step</Button>}
          onCreated={() => {
            void queryClient.invalidateQueries({ queryKey: ["module", mod.id] });
          }}
        />
      </div>
    </div>
  );
}
