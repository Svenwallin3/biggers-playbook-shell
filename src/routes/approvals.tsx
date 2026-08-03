import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockSuggestions, type Suggestion } from "@/data/mockSuggestions";
import { moduleById } from "@/data/mockTraining";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — Biggers Training" },
      {
        name: "description",
        content:
          "Owner view of pending training-content suggestions with a current-vs-suggested comparison and approve or reject actions.",
      },
      { property: "og:title", content: "Approval Queue — Biggers Training" },
      {
        property: "og:description",
        content: "Review and approve pending changes to Biggers Market training content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected">>({});

  function decide(s: Suggestion, decision: "approved" | "rejected") {
    setDecisions((d) => ({ ...d, [s.id]: decision }));
    toast.success(
      decision === "approved"
        ? `Approved — “${s.stepTitle}” would update on save.`
        : `Rejected — ${s.submittedBy} will be notified.`,
    );
  }

  const pending = mockSuggestions.filter((s) => !decisions[s.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner-only. Every content change routes through here, including a manager editing their
          own department.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing pending. Queue is clear.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-5">
        {mockSuggestions.map((s) => {
          const decision = decisions[s.id];
          const mod = moduleById(s.moduleId);
          return (
            <Card key={s.id} className={decision ? "opacity-60" : undefined}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{s.stepTitle}</CardTitle>
                  {decision ? (
                    <Badge variant={decision === "approved" ? "default" : "outline"}>
                      {decision === "approved" ? "Approved" : "Rejected"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <CardDescription>
                  {mod?.trackLabel} · {mod?.title} — submitted by {s.submittedBy} ({s.submittedRole}
                  ) on {s.submittedOn}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Current
                    </p>
                    <ul className="space-y-1 text-sm">
                      {s.currentBody.map((line, i) => (
                        <li key={i} className="text-muted-foreground">
                          {i + 1}. {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Suggested
                    </p>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">What's the step</dt>
                        <dd>{s.whatIsTheStep}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">How it's done</dt>
                        <dd>{s.howIsItDone}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          How you know it's done right
                        </dt>
                        <dd>{s.howDoYouKnow}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {!decision ? (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(s, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(s, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}