import { CheckCircle2, Clapperboard, Image as ImageIcon, ListChecks, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepStatusBadge } from "./StepStatusBadge";
import { stepTypeLabels, type Step } from "@/data/mockTraining";

function ComingSoon({ step, isAdmin }: { step: Step; isAdmin: boolean }) {
  return (
    <Card className="border-dashed bg-muted/40">
      <CardContent className="space-y-2 py-10 text-center">
        <p className="text-sm font-medium text-foreground">Content coming soon</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          This step is part of your training, but the material isn&apos;t finished yet. Your trainer
          will walk you through it in person until it is.
        </p>
        {isAdmin && step.content_notes ? (
          <p className="mx-auto mt-4 max-w-md rounded-md bg-background px-3 py-2 text-left text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Admin note:</span> {step.content_notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Body({ lines }: { lines?: string[] }) {
  if (!lines?.length) return null;
  return (
    <ol className="space-y-3">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
            {i + 1}
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ol>
  );
}

export function StepRenderer({ step, isAdmin = false }: { step: Step; isAdmin?: boolean }) {
  const unavailable = step.content_status === "missing" || step.content_status === "blocked";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {stepTypeLabels[step.step_type]}
        </span>
        <StepStatusBadge status={step.content_status} />
      </div>

      <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>

      {unavailable ? (
        <ComingSoon step={step} isAdmin={isAdmin} />
      ) : (
        <div className="space-y-4">
          {step.content_status === "needs_restructuring" ? (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This step is being refined. The instructions below are accurate but may change.
            </p>
          ) : null}

          {step.step_type === "photo" ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
                <p className="text-sm text-muted-foreground">{step.photoCaption}</p>
              </CardContent>
            </Card>
          ) : null}

          {step.step_type === "video" ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Clapperboard className="size-8" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Short skill clip{step.videoLength ? ` — ${step.videoLength}` : ""}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {step.step_type === "quiz" && step.quiz ? (
            <Card>
              <CardContent className="space-y-4 py-6">
                <p className="flex items-start gap-2 text-sm font-medium">
                  <ListChecks className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {step.quiz.question}
                </p>
                <div className="space-y-2">
                  {step.quiz.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Body lines={step.body} />

          {step.step_type === "doing_signoff" || step.step_type === "supervised_live_practice" ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                <p className="flex items-center gap-2 text-sm">
                  <UserCheck className="size-4 text-primary" />
                  {step.step_type === "doing_signoff"
                    ? "Certification happens when your trainer signs off."
                    : "Day 4 is live practice with real customers, supervised."}
                  {step.signoffBy ? (
                    <span className="text-muted-foreground">Sign-off: {step.signoffBy}</span>
                  ) : null}
                </p>
                <Button size="sm" variant="secondary" disabled>
                  <CheckCircle2 className="size-4" />
                  Awaiting sign-off
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}