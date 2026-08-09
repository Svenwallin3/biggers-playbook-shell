import { CheckCircle2, Clapperboard, Image as ImageIcon, ListChecks, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepStatusBadge } from "./StepStatusBadge";
import { StepTypeChip } from "./StepTypeChip";
import { VideoEmbed, youTubeId } from "@/components/VideoEmbed";
import {
  bodyLines,
  trainerSignoffTypes,
  type QuizRow,
  type StepRow,
} from "@/lib/training.queries";

function ComingSoon({ step, isAdmin }: { step: StepRow; isAdmin: boolean }) {
  const blocked = step.content_status === "blocked";
  return (
    <Card
      className={
        blocked ? "border-dashed border-destructive/30 bg-destructive-soft/40" : "border-dashed bg-info-soft/50"
      }
    >
      <CardContent className="space-y-2 py-8 text-center">
        <p className={`font-display text-sm font-semibold ${blocked ? "text-destructive" : "text-info"}`}>
          {blocked ? "Blocked — not ready yet" : "Content coming soon"}
        </p>
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

  const pairs = lines.map((line) => {
    const i = line.indexOf(" | ");
    if (i === -1) return null;
    const label = line.slice(0, i).trim();
    const value = line.slice(i + 3).trim();
    return label && value ? { label, value } : null;
  });

  if (lines.length >= 2 && pairs.every(Boolean)) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {(pairs as { label: string; value: string }[]).map((pair, i) => {
          const long = pair.value.length > 28;
          return (
            <div
              key={i}
              className={`rounded-lg border border-border bg-surface/70 px-4 py-5 shadow-xs ${
                long ? "text-left" : "text-center"
              }`}
            >
              {long ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {pair.label}
                  </p>
                  <p className="mt-1.5 font-sans text-base leading-relaxed text-primary">
                    {pair.value}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-sans text-2xl font-bold leading-tight text-primary">
                    {pair.value}
                  </p>
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {pair.label}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
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
  signedOff = false,
  canSignOff = false,
  signingOff = false,
  onSignOff,
}: {
  step: StepRow;
  quizzes?: QuizRow[];
  isAdmin?: boolean;
  /** Already certified by a trainer. */
  signedOff?: boolean;
  /** Viewer is a manager/owner allowed to certify this step. */
  canSignOff?: boolean;
  signingOff?: boolean;
  onSignOff?: () => void;
}) {
  const unavailable = step.content_status === "missing" || step.content_status === "blocked";
  const lines = bodyLines(step);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StepTypeChip type={step.step_type} />
        <StepStatusBadge status={step.content_status} />
      </div>

      <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
        {step.title}
      </h2>

      {unavailable ? (
        <ComingSoon step={step} isAdmin={isAdmin} />
      ) : (
        <div className="space-y-4">
          {step.content_status === "needs_restructuring" ? (
            <p className="rounded-md border border-warning/35 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
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
                {youTubeId(step.video_url) ? (
                  <VideoEmbed url={step.video_url} title={step.title} />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Clapperboard className="size-8" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Short skill clip</p>
              </CardContent>
            </Card>
          ) : null}

          {step.step_type !== "video" ? (
            <VideoEmbed url={step.video_url} title={step.title} />
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
            <Card className="mt-8 overflow-hidden border-2 border-dashed border-accent/50 bg-accent/10">
              <div className="bg-accent/25 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
                Certification moment
              </div>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <UserCheck className="size-4 shrink-0 text-accent" />
                  {step.step_type === "doing_signoff"
                    ? "This is the real certification — your trainer signs off after watching you do it."
                    : "Day 4 is live practice with real customers, supervised by your trainer."}
                </p>
                <Button
                  disabled={signedOff || !canSignOff || signingOff}
                  onClick={onSignOff}
                  className={
                    signedOff
                      ? ""
                      : "bg-accent text-accent-foreground hover:bg-accent-bright"
                  }
                >
                  <CheckCircle2 className="size-4" />
                  {signedOff
                    ? "Signed off"
                    : canSignOff
                      ? signingOff
                        ? "Signing off…"
                        : "Sign off"
                      : "Awaiting sign-off"}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
