import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

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
import { useAuth } from "@/hooks/useAuth";
import { stepTypeLabels, type ContentStatus } from "@/lib/training.queries";
import { contentTreeQueryOptions } from "@/lib/admin.queries";

export const Route = createFileRoute("/admin/gaps")({
  head: () => ({
    meta: [
      { title: "Content Gaps — Biggers Training" },
      {
        name: "description",
        content:
          "Live view of every Biggers Market training step that isn't finished yet, grouped by content status and filterable by track and module.",
      },
      { property: "og:title", content: "Content Gaps — Biggers Training" },
      {
        property: "og:description",
        content: "Track which training steps still need content, restructuring, or are blocked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapsPage,
});

const statusOrder: ContentStatus[] = ["blocked", "missing", "needs_restructuring"];
const statusLabels: Record<ContentStatus, string> = {
  ready: "Ready",
  needs_restructuring: "Needs restructuring",
  missing: "Missing",
  blocked: "Blocked",
};

function GapsPage() {
  const { isManagerOrOwner, loading } = useAuth();
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });
  const [trackId, setTrackId] = useState("all");
  const [moduleId, setModuleId] = useState("all");

  if (loading) return null;
  if (!isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The content gaps dashboard is for managers and owners.
        </CardContent>
      </Card>
    );
  }

  const tracks = treeQuery.data?.tracks ?? [];
  const modules = (treeQuery.data?.modules ?? []).filter((m) => !m.is_deleted);
  const steps = (treeQuery.data?.steps ?? []).filter((s) => !s.is_deleted);

  const visibleModules = modules.filter((m) => trackId === "all" || m.track_id === trackId);
  const gaps = steps
    .filter((s) => s.content_status !== "ready")
    .map((s) => ({ step: s, module: modules.find((m) => m.id === s.module_id) }))
    .filter((row) => row.module)
    .filter((row) => trackId === "all" || row.module!.track_id === trackId)
    .filter((row) => moduleId === "all" || row.module!.id === moduleId);

  const readyCount = steps.filter((s) => s.content_status === "ready").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content gaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live from the database — this updates the moment a step&apos;s content status changes
          anywhere else in the app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{readyCount}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        {statusOrder.map((status) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold">
                {steps.filter((s) => s.content_status === status).length}
              </p>
              <p className="text-xs text-muted-foreground">{statusLabels[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={trackId}
          onValueChange={(v) => {
            setTrackId(v);
            setModuleId("all");
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All tracks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tracks</SelectItem>
            {tracks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={moduleId} onValueChange={setModuleId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {visibleModules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {treeQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading content…</p>
      ) : null}

      {!treeQuery.isPending && gaps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No gaps in this filter — every step here is marked ready.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {gaps.map(({ step, module }) => (
          <Card key={step.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  <Link
                    to="/preview"
                    search={{
                      track: module!.track_id,
                      module: module!.id,
                      step: step.id,
                      branch: module!.path_id ?? undefined,
                    }}
                    className="hover:underline"
                  >
                    {step.title}
                  </Link>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stepTypeLabels[step.step_type]}</Badge>
                  <StepStatusBadge status={step.content_status} />
                </div>
              </div>
              <CardDescription>
                {module!.track?.name} · {module!.name}
                {step.location_tag ? ` · ${step.location_tag}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {statusLabels[step.content_status]}:
                </span>{" "}
                {step.content_notes ?? "No admin note recorded yet."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
