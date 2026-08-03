import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { modules, steps, stepTypeLabels } from "@/data/mockTraining";

export const Route = createFileRoute("/admin/gaps")({
  head: () => ({
    meta: [
      { title: "Content Gaps — Biggers Training" },
      {
        name: "description",
        content:
          "Admin dashboard listing every training step that isn't finished yet, with its status, notes, and owning module.",
      },
      { property: "og:title", content: "Content Gaps — Biggers Training" },
      {
        property: "og:description",
        content: "Every unfinished Biggers Market training step in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapsPage,
});

function GapsPage() {
  const [track, setTrack] = useState("all");
  const [moduleId, setModuleId] = useState("all");

  const gaps = useMemo(
    () =>
      steps
        .filter((s) => s.content_status !== "ready")
        .map((s) => ({ step: s, module: modules.find((m) => m.id === s.moduleId)! }))
        .filter((g) => (track === "all" ? true : g.module.track === track))
        .filter((g) => (moduleId === "all" ? true : g.module.id === moduleId)),
    [track, moduleId],
  );

  const moduleOptions = modules.filter((m) => track === "all" || m.track === track);

  const counts = {
    needs_restructuring: gaps.filter((g) => g.step.content_status === "needs_restructuring").length,
    missing: gaps.filter((g) => g.step.content_status === "missing").length,
    blocked: gaps.filter((g) => g.step.content_status === "blocked").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content gaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-only. Every step that isn't marked ready, and what's holding it up.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            value={track}
            onValueChange={(v) => {
              setTrack(v);
              setModuleId("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tracks</SelectItem>
              {[...new Set(modules.map((m) => m.track))].map((t) => (
                <SelectItem key={t} value={t}>
                  {modules.find((m) => m.track === t)?.trackLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={moduleId} onValueChange={setModuleId}>
            <SelectTrigger>
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {moduleOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{counts.needs_restructuring} being refined</Badge>
        <Badge variant="outline">{counts.missing} missing</Badge>
        <Badge variant="outline">{counts.blocked} blocked</Badge>
      </div>

      {gaps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No gaps in this filter — everything here is marked ready.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gaps.map(({ step, module: mod }) => (
            <Card key={step.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <StepStatusBadge status={step.content_status} />
                  <Badge variant="outline" className="text-[11px]">
                    {step.content_status}
                  </Badge>
                </div>
                <CardDescription>
                  {mod.trackLabel} ·{" "}
                  <Link
                    to="/modules/$moduleId"
                    params={{ moduleId: mod.id }}
                    search={{ step: undefined }}
                    className="underline underline-offset-2"
                  >
                    {mod.title}
                  </Link>{" "}
                  · {stepTypeLabels[step.step_type]} · {step.location_tag}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {step.content_notes ?? (
                    <span className="text-muted-foreground">No notes recorded yet.</span>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}