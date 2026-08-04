import { CheckCircle2, Clapperboard, Image as ImageIcon, ListChecks, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepStatusBadge } from "./StepStatusBadge";
import {
  bodyLines,
  stepTypeLabels,
  trainerSignoffTypes,
  type QuizRow,
  type StepRow,
} from "@/lib/training.queries";

function ComingSoon({ step, isAdmin }: { step: StepRow; isAdmin: boolean }) {
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

function Body({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
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

export function StepRenderer({
  step,
  quizzes = [],
  isAdmin = false,
}: {
  step: StepRow;
  quizzes?: QuizRow[];
  isAdmin?: boolean;
}) {
  const unavailable = step.content_status === "missing" || step.content_status === "blocked";
  const lines = bodyLines(step);

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
                {step.media_url ? (
                  <img
                    src={step.media_url}
                    alt={step.title}
                    loading="lazy"
                    className="max-h-72 w-full rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {step.step_type === "video" ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Clapperboard className="size-8" />
                </div>
                <p className="text-sm text-muted-foreground">Short skill clip</p>
              </CardContent>
            </Card>
          ) : null}

          {step.step_type === "quiz" && quizzes.length ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardContent className="space-y-4 py-6">
                    <p className="flex items-start gap-2 text-sm font-medium">
                      <ListChecks className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {quiz.question}
                    </p>
                    <div className="space-y-2">
                      {(Array.isArray(quiz.options) ? (quiz.options as unknown[]) : []).map(
                        (option, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            {String(option)}
                          </button>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <Body lines={lines} />

          {trainerSignoffTypes.includes(step.step_type) ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                <p className="flex items-center gap-2 text-sm">
                  <UserCheck className="size-4 text-primary" />
                  {step.step_type === "doing_signoff"
                    ? "Certification happens when your trainer signs off."
                    : "Day 4 is live practice with real customers, supervised."}
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
