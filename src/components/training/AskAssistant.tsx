import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Compass, MessageCircleQuestion, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MascotImage } from "@/components/brand/MascotImage";
import { Input } from "@/components/ui/input";
import { askTraining, type AskAnswer } from "@/lib/ask.functions";
import { retrieveContext, type AskSource } from "@/lib/ask.retrieval";

const EXAMPLES = ["Where are the tomatoes from?", "What's the FIFO rotation rule again?"];

export function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [sources, setSources] = useState<AskSource[]>([]);
  const ask = useServerFn(askTraining);

  const answerMutation = useMutation<AskAnswer, Error, string>({
    mutationFn: async (q) => {
      const found = await retrieveContext(q);
      setSources(found);
      return ask({
        data: {
          question: q,
          sources: found.map((s) => ({
            ref: s.ref,
            label: s.label,
            sublabel: s.sublabel,
            text: s.text,
          })),
        },
      });
    },
  });

  function submit(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setQuestion(trimmed);
    setAsked(trimmed);
    answerMutation.mutate(trimmed);
  }

  const result = answerMutation.data;
  const cited = result?.usedRefs?.length
    ? sources.filter((s) => result.usedRefs.includes(s.ref))
    : [];

  return (
    <div className="rounded-xl border border-accent/35 bg-accent/8 px-4 py-4 sm:px-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        <MascotImage path="mascot/assistant.png" alt="" className="h-8 sm:h-10" />
        <Sparkle className="size-3.5" /> Just ask
      </p>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
      >
        <div className="relative flex-1">
          <MessageCircleQuestion className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question — “where are the tomatoes from?”"
            className="h-12 border-border bg-card pl-9 text-base shadow-xs"
            aria-label="Ask a question about training or sourcing"
          />
        </div>
        <Button
          type="submit"
          className="h-12 px-4"
          disabled={answerMutation.isPending || question.trim().length < 2}
        >
          {answerMutation.isPending ? "Looking…" : "Ask"}
          <ArrowRight className="size-4" />
        </Button>
      </form>

      {!asked && !answerMutation.isPending ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => submit(example)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      {answerMutation.isPending ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Searching our training and sourcing content…
        </p>
      ) : null}

      {answerMutation.isError ? (
        <p className="mt-3 text-sm text-destructive">{answerMutation.error.message}</p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-line">{result.answer}</p>

          {cited.length ? (
            <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                From
              </p>
              {cited.map((source) =>
                source.kind === "sourcing" ? (
                  <Link
                    key={source.ref}
                    to="/reference/sourcing"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Compass className="size-3.5" />
                    {source.label} · Sourcing Board
                  </Link>
                ) : source.moduleId ? (
                  <Link
                    key={source.ref}
                    to="/modules/$moduleId"
                    params={{ moduleId: source.moduleId }}
                    search={{ step: source.stepId }}
                    className="block text-sm text-primary hover:underline"
                  >
                    {source.label} · {source.sublabel}
                  </Link>
                ) : null,
              )}
            </div>
          ) : null}

          {!result.answered ? (
            <Link
              to="/search"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Browse full search instead
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}