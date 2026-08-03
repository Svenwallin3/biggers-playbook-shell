import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { StepRenderer } from "@/components/training/StepRenderer";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import { moduleById, stepsForModule } from "@/data/mockTraining";

export const Route = createFileRoute("/modules/$moduleId")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: typeof search["step"] === "string" ? search["step"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Module — Biggers Training Platform" },
      { name: "description", content: "Step-by-step training module for Biggers Market staff." },
      { property: "og:title", content: "Module — Biggers Training Platform" },
      {
        property: "og:description",
        content: "Step-by-step training module for Biggers Market staff.",
      },
    ],
  }),
  loader: ({ params }) => {
    const mod = moduleById(params.moduleId);
    if (!mod) throw notFound();
    return null;
  },
  component: ModulePage,
});

function ModulePage() {
  const { moduleId } = Route.useParams();
  const { step: stepParam } = Route.useSearch();
  const mod = moduleById(moduleId)!;
  const steps = stepsForModule(moduleId);
  const active = steps.find((s) => s.id === stepParam) ?? steps[0];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← Today&apos;s training
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {mod.trackLabel}
          {mod.sub_path ? ` · ${mod.sub_path}` : ""} · {mod.day_assignment}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{mod.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mod.summary}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {steps.map((s) => (
            <Link
              key={s.id}
              to="/modules/$moduleId"
              params={{ moduleId }}
              search={{ step: s.id }}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active && s.id === active.id
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <span className="shrink-0">{s.order}.</span>
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <StepStatusBadge status={s.content_status} />
            </Link>
          ))}
        </nav>

        <div className="space-y-6">
          {active ? <StepRenderer step={active} /> : null}
          {active ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <FlagStepButton stepTitle={active.title} />
              <Button size="sm" variant="outline" disabled>
                Mark complete
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
