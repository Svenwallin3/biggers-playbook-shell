import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ListChecks,
  PenLine,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoredPhoto } from "@/components/PhotoUpload";
import { supabase } from "@/integrations/supabase/client";
import { StepStatusBadge } from "./StepStatusBadge";
import { renderFormattedText } from "@/lib/richText";
import { DangerZoneGraphic } from "./DangerZoneGraphic";
import {
  BlockRenderer,
  BulletedList,
  HeadingBlock,
  LabelValueList,
  NumberedList,
  type StepBlockRow,
} from "./BlockRenderer";
import { StepTypeChip } from "./StepTypeChip";
import { VideoEmbed, youTubeId } from "@/components/VideoEmbed";
import {
  bodyLines,
  trainerSignoffTypes,
  type QuizRow,
  type StepRow,
} from "@/lib/training.queries";

function ManagerInitials({
  initialedBy,
  initialedAt,
  canSignOff,
  pending,
  onLog,
}: {
  initialedBy: string | null | undefined;
  initialedAt: string | null | undefined;
  canSignOff: boolean;
  pending: boolean;
  onLog?: (() => void) | undefined;
}) {
  const nameQuery = useQuery({
    queryKey: ["employee-name", initialedBy],
    enabled: Boolean(initialedBy),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("full_name, email")
        .eq("id", initialedBy!)
        .maybeSingle();
      if (error) throw error;
      return data?.full_name ?? data?.email ?? null;
    },
  });

  if (initialedBy) {
    const when = initialedAt ? new Date(initialedAt).toLocaleDateString() : null;
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <PenLine className="size-3.5 shrink-0" aria-hidden="true" />
        Initialed by {nameQuery.data ?? "your manager"}
        {when ? ` on ${when}` : ""}
      </p>
    );
  }

  if (!canSignOff) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || !onLog}
      onClick={onLog}
    >
      <PenLine className="size-4" aria-hidden="true" />
      {pending ? "Saving…" : "Log manager initials"}
    </Button>
  );
}

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

const DANGER_ZONE_MARKER = "[[danger-zone]]";

function Body({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  if (lines.some((line) => line.trim() === DANGER_ZONE_MARKER)) {
    const blocks: { marker: boolean; lines: string[] }[] = [];
    for (const line of lines) {
      if (line.trim() === DANGER_ZONE_MARKER) {
        blocks.push({ marker: true, lines: [] });
      } else {
        const last = blocks[blocks.length - 1];
        if (!last || last.marker) blocks.push({ marker: false, lines: [line] });
        else last.lines.push(line);
      }
    }
    return (
      <div className="space-y-4">
        {blocks.map((block, i) =>
          block.marker ? (
            <DangerZoneGraphic key={i} />
          ) : (
            <BodyBlock key={i} lines={block.lines} />
          ),
        )}
      </div>
    );
  }
  return <BodyBlock lines={lines} />;
}

function BodyBlock({ lines }: { lines: string[] }) {
  if (!lines.length) return null;

  if (lines.some((line) => line.startsWith("## "))) {
    const sections: { heading: string | null; bullets: string[] }[] = [];
    for (const line of lines) {
      if (line.startsWith("## ")) {
        sections.push({ heading: line.slice(3).trim(), bullets: [] });
      } else {
        if (!sections.length) sections.push({ heading: null, bullets: [] });
        sections[sections.length - 1]!.bullets.push(line);
      }
    }

    return (
      <div className="space-y-5">
        {sections.map((section, i) => (
          <div key={i} className="space-y-1.5">
            {section.heading ? <HeadingBlock text={section.heading} level="h2" /> : null}
            <BulletedList items={section.bullets} />
          </div>
        ))}
      </div>
    );
  }

  const pairs = lines.map((line) => {
    const i = line.indexOf(" | ");
    if (i === -1) return null;
    const label = line.slice(0, i).trim();
    const value = line.slice(i + 3).trim();
    return label && value ? { label, value } : null;
  });

  if (lines.length >= 2 && pairs.every(Boolean)) {
    return <LabelValueList pairs={pairs as { label: string; value: string }[]} />;
  }

  return <NumberedList items={lines} />;
}

export function StepRenderer({
  step,
  quizzes = [],
  isAdmin = false,
  signedOff = false,
  canSignOff = false,
  signingOff = false,
  onSignOff,
  initialedBy,
  initialedAt,
  loggingInitials = false,
  onLogInitials,
  titleAs = "h2",
  titleAction,
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
  /** Manager-initials record on the viewed employee's progress row. */
  initialedBy?: string | null | undefined;
  initialedAt?: string | null | undefined;
  loggingInitials?: boolean;
  onLogInitials?: (() => void) | undefined;
  /** The step title is the dominant heading on module screens. */
  titleAs?: "h1" | "h2";
  /** Optional slot rendered inline to the right of the step title. */
  titleAction?: ReactNode;
}) {
  const unavailable = step.content_status === "missing" || step.content_status === "blocked";
  const lines = bodyLines(step);
  const Title = titleAs;

  const blocksQuery = useQuery({
    queryKey: ["step-blocks", step.id],
    enabled: !unavailable,
    queryFn: async (): Promise<StepBlockRow[]> => {
      const { data, error } = await supabase
        .from("step_blocks")
        .select("id, block_type, payload, sequence_order")
        .eq("step_id", step.id)
        .eq("is_deleted", false)
        .order("sequence_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StepBlockRow[];
    },
  });
  const blocks = blocksQuery.data ?? [];
  const hasBlocks = blocks.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StepTypeChip type={step.step_type} />
        <StepStatusBadge status={step.content_status} />
      </div>

      <div className="flex items-start gap-2">
        <Title className="min-w-0 flex-1 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {step.title}
        </Title>
        {titleAction ? <div className="shrink-0">{titleAction}</div> : null}
      </div>

      {unavailable ? (
        <ComingSoon step={step} isAdmin={isAdmin} />
      ) : (
        <div className="space-y-4">
          {step.content_status === "needs_restructuring" ? (
            <p className="rounded-md border border-warning/35 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
              This step is being refined. The instructions below are accurate but may change.
            </p>
          ) : null}

          {hasBlocks ? null : step.media_url ? (
            <Card className="overflow-hidden">
              <CardContent className="space-y-3 px-0 py-0 sm:px-6 sm:py-6">
                <StoredPhoto
                  path={step.media_url}
                  alt={step.title}
                  className="mx-auto block h-auto w-full max-w-2xl rounded-none border-0 object-contain sm:rounded-md"
                />
              </CardContent>
            </Card>
          ) : null}

          {!hasBlocks && youTubeId(step.video_url) ? (
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
                            className="min-h-11 w-full rounded-md border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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

          {hasBlocks ? <BlockRenderer blocks={blocks} /> : <Body lines={lines} />}

          {step.supports_manager_initials ? (
            <div className="pt-1">
              <ManagerInitials
                initialedBy={initialedBy}
                initialedAt={initialedAt}
                canSignOff={canSignOff}
                pending={loggingInitials}
                onLog={onLogInitials}
              />
            </div>
          ) : null}

          {trainerSignoffTypes.includes(step.step_type) ? (
            <>
              {canSignOff && step.content_notes ? (
                <div className="mt-8 rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Manager note:</span>{" "}
                  {step.content_notes}
                </div>
              ) : null}
            <Card className="mt-8 overflow-hidden border-2 border-dashed border-accent/50 bg-accent/10">
              <div className="bg-accent/25 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-foreground">
                Certification moment
              </div>
              <CardContent className="flex flex-col items-start gap-3 py-5">
                {canSignOff && !signedOff ? (
                  <div className="w-full space-y-1.5">
                    <label
                      htmlFor={`handoff-${step.id}`}
                      className="text-xs font-semibold text-foreground"
                    >
                      Notes for the next trainer (optional)
                    </label>
                    <Textarea
                      id={`handoff-${step.id}`}
                      value={handoffNotes}
                      onChange={(e) => setHandoffNotes(e.target.value)}
                      rows={2}
                      placeholder="Anything the next trainer should know…"
                    />
                    <p className="text-xs text-muted-foreground">
                      Only visible to managers. The trainee won&apos;t see this.
                    </p>
                  </div>
                ) : null}
                <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <UserCheck className="size-4 shrink-0 text-accent" />
                  {step.step_type === "doing_signoff"
                    ? "This is the real certification — your trainer signs off after watching you do it."
                    : "Day 4 is live practice with real customers, supervised by your trainer."}
                </p>

                <Button
                  disabled={signedOff || !canSignOff || signingOff}
                  onClick={onSignOff}
                  className={`h-11 w-full sm:h-9 sm:w-auto ${
                    signedOff
                      ? ""
                      : "bg-accent text-accent-foreground hover:bg-accent-bright"
                  }`}
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
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
