import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Pencil, Plus } from "lucide-react";

import { NewModuleDialog } from "@/components/admin/ContentCreateDialogs";
import { NewAssignmentDialog } from "@/components/admin/NewAssignmentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Department, ModuleRow, TrackRow } from "@/lib/training.queries";

type Mod = ModuleRow & { isAllDivisions: boolean };

const UNCATEGORIZED = "Uncategorized";

export function AssignableModulesTile({
  activeTrack,
  universalTrack,
  allModules,
  canManage,
  actorId,
}: {
  activeTrack: TrackRow;
  universalTrack: TrackRow | undefined;
  allModules: ModuleRow[];
  canManage: boolean;
  actorId: string | null;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assignModule, setAssignModule] = useState<ModuleRow | null>(null);

  const isUniversal = activeTrack.department === "universal";

  const mods: Mod[] = useMemo(
    () =>
      allModules
        .filter(
          (m) =>
            m.is_assignable &&
            !m.is_deleted &&
            (m.track_id === activeTrack.id ||
              (!isUniversal && universalTrack && m.track_id === universalTrack.id)),
        )
        .map((m) => ({ ...m, isAllDivisions: m.track_id === universalTrack?.id })),
    [allModules, activeTrack.id, universalTrack, isUniversal],
  );

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? mods.filter(
          (m) =>
            m.name.toLowerCase().includes(q) || (m.category ?? "").toLowerCase().includes(q),
        )
      : mods;
    const map = new Map<string, Mod[]>();
    for (const m of filtered) {
      const k = m.category?.trim() || UNCATEGORIZED;
      map.set(k, [...(map.get(k) ?? []), m]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)))
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [mods, search]);

  const goToNew = (id: string) => {
    setOpen(false);
    void navigate({ to: "/modules/$moduleId", params: { moduleId: id }, search: { preview: true } });
  };

  const countFor = (trackId: string) => allModules.filter((m) => m.track_id === trackId).length + 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/10"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">
            Assignable modules in {activeTrack.name}
            <span className="ml-2 font-normal text-muted-foreground">({mods.length})</span>
          </span>
          <span className="block text-xs text-muted-foreground">
            Not part of the new-hire walk — tap to edit, assign or add
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assignable modules in {activeTrack.name}</SheetTitle>
            <SheetDescription>
              Modules tagged "All divisions" appear in Market, Kitchen and Delivery. Editing one
              changes it everywhere.
            </SheetDescription>
          </SheetHeader>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <NewModuleDialog
                trackId={activeTrack.id}
                department={activeTrack.department as Department}
                nextSequence={countFor(activeTrack.id)}
                defaultIsAssignable
                onCreated={goToNew}
                trigger={
                  <Button size="sm" variant="outline">
                    <Plus className="size-4" aria-hidden /> {activeTrack.name} only
                  </Button>
                }
              />
              {universalTrack && !isUniversal ? (
                <NewModuleDialog
                  trackId={universalTrack.id}
                  department={"universal" as Department}
                  nextSequence={countFor(universalTrack.id)}
                  defaultIsAssignable
                  onCreated={goToNew}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Plus className="size-4" aria-hidden /> All divisions
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : null}

          <Input
            placeholder="Search by name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mods.length ? "No matches." : "None in this division yet."}
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.category}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.category}
                  </p>
                  <ul className="divide-y rounded-md border">
                    {g.items.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{m.name}</span>
                          {m.isAllDivisions ? (
                            <Badge variant="secondary" className="mt-0.5 text-[10px]">
                              All divisions
                            </Badge>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <Button asChild size="icon" variant="ghost" className="size-9">
                            <Link
                              to="/modules/$moduleId"
                              params={{ moduleId: m.id }}
                              search={{ preview: true }}
                              aria-label={`Edit ${m.name}`}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Link>
                          </Button>
                          {canManage ? (
                            <Button size="sm" onClick={() => setAssignModule(m)}>
                              Assign
                            </Button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <NewAssignmentDialog
        actorId={actorId}
        open={!!assignModule}
        onOpenChange={(next) => {
          if (!next) setAssignModule(null);
        }}
        presetModuleId={assignModule?.id}
        presetModuleName={assignModule?.name}
      />
    </>
  );
}
