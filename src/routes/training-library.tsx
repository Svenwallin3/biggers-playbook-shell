import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { planQueryOptions, type PlanModule } from "@/lib/training.queries";

const title = "Browse all training — Biggers Training Platform";
const description =
  "Revisit any training module available to you at Biggers Market, grouped by track.";

export const Route = createFileRoute("/training-library")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: TrainingLibraryPage,
});

function TrainingLibraryPage() {
  const { employee, loading } = useAuth();
  const planQuery = useQuery({
    ...planQueryOptions(employee?.path ?? null),
    enabled: !!employee,
  });

  const grouped = useMemo(() => {
    const byTrack = new Map<string, { name: string; modules: PlanModule[] }>();
    for (const mod of planQuery.data ?? []) {
      const existing = byTrack.get(mod.track.id);
      if (existing) existing.modules.push(mod);
      else byTrack.set(mod.track.id, { name: mod.track.name, modules: [mod] });
    }
    return [...byTrack.values()];
  }, [planQuery.data]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!employee) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to browse training.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
          <BookOpen className="size-5 text-primary" />
          Browse all training
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything available to you — open any module to refresh on something you&apos;ve
          already covered.
        </p>
      </div>

      {planQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading modules…</p>
      ) : null}
      {planQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load training.</p>
      ) : null}
      {!planQuery.isPending && !grouped.length ? (
        <p className="text-sm text-muted-foreground">Nothing is available to you yet.</p>
      ) : null}

      {grouped.map((track) => (
        <section key={track.name} className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {track.name}
          </h2>
          <Card>
            <CardContent className="px-0 py-0">
              <ul className="divide-y">
                {track.modules.map((mod) => (
                  <li key={mod.id}>
                    <Link
                      to="/modules/$moduleId"
                      params={{ moduleId: mod.id }}
                      search={{ step: undefined }}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{mod.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {mod.sub_path ? `${mod.sub_path} · ` : ""}
                          {mod.day_assignment ? `Day ${mod.day_assignment} · ` : ""}
                          {mod.steps.length} step{mod.steps.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}