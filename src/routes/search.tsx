import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import {
  modules,
  moduleById,
  sourcingBoard,
  stepTypeLabels,
  steps,
} from "@/data/mockTraining";

const title = "Search — Biggers Training Platform";
const description = "Search modules, steps, and sourcing entries across Biggers Market training.";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mock results — full-text search gets wired up in a later stage.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “rotation”, “temp log”, “grits”…"
          className="h-12 pl-9 text-base"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Modules
        </h2>
        {modules.map((mod) => (
          <Link key={mod.id} to="/modules/$moduleId" params={{ moduleId: mod.id }}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="py-4">
                <p className="text-sm font-medium">{mod.title}</p>
                <p className="text-xs text-muted-foreground">
                  {mod.trackLabel}
                  {mod.sub_path ? ` · ${mod.sub_path}` : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Steps
        </h2>
        {steps.slice(0, 6).map((step) => (
          <Link
            key={step.id}
            to="/modules/$moduleId"
            params={{ moduleId: step.moduleId }}
            search={{ step: step.id }}
          >
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex flex-wrap items-center gap-2 py-4">
                <span className="text-sm font-medium">{step.title}</span>
                <StepStatusBadge status={step.content_status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {moduleById(step.moduleId)?.title} · {stepTypeLabels[step.step_type]}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sourcing Board
        </h2>
        {sourcingBoard.map((entry) => (
          <Link key={entry.id} to="/sourcing-board">
            <Card className="transition-colors hover:border-primary">
              <CardContent className="py-4">
                <p className="text-sm font-medium">{entry.item}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.supplier} — {entry.note}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}