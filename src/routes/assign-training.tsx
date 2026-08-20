import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Pencil } from "lucide-react";

import { NewModuleDialog } from "@/components/admin/ContentCreateDialogs";
import { NewAssignmentDialog } from "@/components/admin/NewAssignmentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { contentTreeQueryOptions } from "@/lib/admin.queries";
import type { Department, ModuleRow } from "@/lib/training.queries";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/assign-training")({
  head: () => ({
    meta: [
      { title: "Assign Training — Biggers Training" },
      {
        name: "description",
        content:
          "Browse restricted, assignable training modules by division and category, and assign them to Biggers Market employees.",
      },
      { property: "og:title", content: "Assign Training — Biggers Training" },
      {
        property: "og:description",
        content: "Find an assignable module by division and category, then assign it to someone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignTrainingPage,
});

const divisions: { value: Department; label: string }[] = [
  { value: "kitchen", label: "Kitchen" },
  { value: "market", label: "Market" },
  { value: "delivery", label: "Delivery" },
  { value: "universal", label: "Universal" },
];

const UNCATEGORIZED = "Uncategorized";

function AssignTrainingPage() {
  const { employee, isManagerOrOwner, isOwner, isGeneralManager, loading } = useAuth();
  const canManage = isOwner || isGeneralManager;
  const navigate = useNavigate();
  const tree = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });


  const [division, setDivision] = useState<Department>("kitchen");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [assignModule, setAssignModule] = useState<ModuleRow | null>(null);

  const modules = tree.data?.modules ?? [];
  const tracks = tree.data?.tracks ?? [];

  /** Assignable, non-hidden modules in the selected division, grouped by category. */
  const groups = useMemo(() => {
    const mine = modules.filter(
      (m) => m.is_assignable && !m.is_deleted && m.track?.department === division,
    );
    const byCategory = new Map<string, typeof mine>();
    for (const m of mine) {
      const key = m.category?.trim() || UNCATEGORIZED;
      byCategory.set(key, [...(byCategory.get(key) ?? []), m]);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) =>
        a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b),
      )
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [modules, division]);

  const divisionTrack = tracks.find((t) => t.department === division && !t.is_deleted);

  if (loading) return null;
  if (!isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          This view is for managers and owners.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assign training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restricted modules (equipment certifications and similar), grouped by division and
          category. {canManage ? "Pick one to assign it to someone." : "Read-only for your role."}
        </p>
      </div>

      {/* Mobile: division dropdown. Wider: pill row. */}
      <div className="sm:hidden">
        <Select value={division} onValueChange={(v) => setDivision(v as Department)}>
          <SelectTrigger aria-label="Division">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="-mx-4 hidden gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex sm:px-0">
        {divisions.map((d) => (
          <Button
            key={d.value}
            size="sm"
            variant={division === d.value ? "default" : "outline"}
            onClick={() => setDivision(d.value)}
          >
            {d.label}
          </Button>
        ))}
      </div>

      {tree.isPending ? (
        <p className="text-sm text-muted-foreground">Loading modules…</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No assignable modules in this division yet.
            </p>
            {canManage && divisionTrack ? (
              <NewModuleDialog
                trackId={divisionTrack.id}
                department={division}
                nextSequence={modules.filter((m) => m.track_id === divisionTrack.id).length + 1}
                defaultIsAssignable
                onCreated={(id) =>
                  navigate({
                    to: "/modules/$moduleId",
                    params: { moduleId: id },
                    search: { preview: true },
                  })
                }
                trigger={
                  <Button size="sm" variant="outline">
                    + New module
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const key = `${division}:${group.category}`;
            const open = openGroups[key] ?? true;
            return (
              <Card key={key}>
                <Collapsible
                  open={open}
                  onOpenChange={(next) => setOpenGroups((s) => ({ ...s, [key]: next }))}
                >
                  <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                    <CollapsibleTrigger className="flex min-w-0 items-center gap-2 text-left">
                      <ChevronRight
                        className={cn("size-4 shrink-0 transition-transform", open && "rotate-90")}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{group.category}</CardTitle>
                        <CardDescription>
                          {group.items.length} module{group.items.length === 1 ? "" : "s"}
                        </CardDescription>
                      </div>
                    </CollapsibleTrigger>
                    {canManage && divisionTrack ? (
                      <NewModuleDialog
                        trackId={divisionTrack.id}
                        department={division}
                        nextSequence={
                          modules.filter((m) => m.track_id === divisionTrack.id).length + 1
                        }
                        defaultIsAssignable
                        defaultCategory={
                          group.category === UNCATEGORIZED ? "" : group.category
                        }
                        onCreated={(id) =>
                          navigate({
                            to: "/modules/$moduleId",
                            params: { moduleId: id },
                            search: { preview: true },
                          })
                        }
                        trigger={
                          <Button size="sm" variant="outline" className="shrink-0">
                            + New module
                          </Button>
                        }
                      />
                    ) : null}
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      {group.items.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.track?.name ?? "—"}
                              {m.location_tag ? ` · ${m.location_tag}` : ""}
                            </p>
                          </div>
                          {canManage ? (
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild size="icon" variant="ghost" className="size-9">
                                    <Link
                                      to="/modules/$moduleId"
                                      params={{ moduleId: m.id }}
                                      search={{ preview: true }}
                                      aria-label={`Manage content for ${m.name}`}
                                    >
                                      <Pencil className="size-4" aria-hidden />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Manage content</TooltipContent>
                              </Tooltip>
                              <Button size="sm" onClick={() => setAssignModule(m)}>
                                Assign
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary">View only</Badge>
                          )}

                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      <NewAssignmentDialog
        actorId={employee?.id ?? null}
        open={!!assignModule}
        onOpenChange={(next) => {
          if (!next) setAssignModule(null);
        }}
        presetModuleId={assignModule?.id}
        presetModuleName={assignModule?.name}
      />
    </div>
  );
}
