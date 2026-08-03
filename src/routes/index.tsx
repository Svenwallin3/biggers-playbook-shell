import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Compass, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FlagStepButton } from "@/components/training/FlagStepButton";
import { StepStatusBadge } from "@/components/training/StepStatusBadge";
import {
  completedStepIds,
  mockEmployee,
  moduleById,
  stepTypeLabels,
  stepsForModule,
  todaysModuleIds,
} from "@/data/mockTraining";

const title = "Today's training — Biggers Training Platform";
const description =
  "Your assigned training modules and steps for today at Biggers Market.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  const assignedSteps = todaysModuleIds.flatMap((id) => stepsForModule(id));
  const done = assignedSteps.filter((s) => completedStepIds.has(s.id)).length;
  const pct = Math.round((done / Math.max(assignedSteps.length, 1)) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {mockEmployee.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mockEmployee.path} path · {mockEmployee.startedOn}
        </p>
      </div>

      <Link to="/search" className="block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            placeholder="Search every module, step, and sourcing entry…"
            className="h-12 cursor-pointer pl-9 text-base"
          />
        </div>
      </Link>

      <Card>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Your progress</span>
            <span className="text-muted-foreground">
              {done} of {assignedSteps.length} steps
            </span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <section className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today, in order
        </h2>
        {todaysModuleIds.map((moduleId) => {
          const mod = moduleById(moduleId);
          if (!mod) return null;
          const modSteps = stepsForModule(moduleId);
          return (
            <Card key={moduleId}>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {mod.trackLabel}
                      {mod.sub_path ? ` · ${mod.sub_path}` : ""} · {mod.day_assignment}
                    </p>
                    <Link
                      to="/modules/$moduleId"
                      params={{ moduleId }}
                      className="text-base font-semibold hover:underline"
                    >
                      {mod.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{mod.summary}</p>
                  </div>
                </div>

                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {modSteps.map((step) => (
                    <li
                      key={step.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <Link
                        to="/modules/$moduleId"
                        params={{ moduleId }}
                        search={{ step: step.id }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                      >
                        <span
                          className={
                            completedStepIds.has(step.id)
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {step.order}. {step.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stepTypeLabels[step.step_type]}
                        </span>
                        <StepStatusBadge status={step.content_status} />
                      </Link>
                      <FlagStepButton stepTitle={step.title} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Link to="/sourcing-board" className="block">
        <Card className="transition-colors hover:border-primary">
          <CardContent className="flex items-center gap-3 py-5">
            <Compass className="size-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sourcing Board</p>
              <p className="text-sm text-muted-foreground">
                Where our products come from — guest questions, answered
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
