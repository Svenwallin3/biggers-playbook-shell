import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modules, steps } from "@/data/mockTraining";

export const Route = createFileRoute("/suggest")({
  head: () => ({
    meta: [
      { title: "Suggest a Change — Biggers Training" },
      {
        name: "description",
        content:
          "Managers submit a structured suggestion for any training step: what the step is, how it's done, and how you know it's done right.",
      },
      { property: "og:title", content: "Suggest a Change — Biggers Training" },
      {
        property: "og:description",
        content: "Structured 3-field suggestion form for Biggers Market training content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuggestPage,
});

function SuggestPage() {
  const [stepId, setStepId] = useState(steps[0]!.id);
  const [what, setWhat] = useState("");
  const [how, setHow] = useState("");
  const [know, setKnow] = useState("");
  const [nudged, setNudged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const thin = how.trim() === "" || know.trim() === "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (what.trim() === "") {
      toast.error("Tell us which step this is about first.");
      return;
    }
    if (thin && !nudged) {
      setNudged(true);
      return;
    }
    setSubmitted(true);
    toast.success("Suggestion sent to the Owner approval queue.");
  }

  if (submitted) {
    const step = steps.find((s) => s.id === stepId);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Suggestion submitted</CardTitle>
            <CardDescription>
              Your suggestion for “{step?.title}” is in the Owner approval queue. Nothing changes in
              the training content until it's approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setNudged(false);
                setWhat("");
                setHow("");
                setKnow("");
              }}
            >
              Submit another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suggest a change</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Managers can suggest a change to any step, company-wide. An Owner approves before anything
          goes live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label>Which step?</Label>
              <Select value={stepId} onValueChange={setStepId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectGroupItems key={m.id} moduleId={m.id} label={m.title} />
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="what">1. What's the step?</Label>
              <Input
                id="what"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="Rotating dated product before restocking"
                maxLength={140}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="how">2. How is it done?</Label>
              <Textarea
                id="how"
                value={how}
                onChange={(e) => setHow(e.target.value)}
                rows={4}
                placeholder="Walk through it the way you'd walk a new hire through it."
                maxLength={1500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="know">3. How do you know it's done right?</Label>
              <Textarea
                id="know"
                value={know}
                onChange={(e) => setKnow(e.target.value)}
                rows={3}
                placeholder="What you'd check before you'd sign off on it."
                maxLength={1500}
              />
            </div>

            {nudged && thin ? (
              <Alert>
                <AlertDescription>
                  Would a brand-new hire know how to do this? Fields 2 and 3 are what make a
                  suggestion usable — add them if you can. Submit again to send it as-is.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Button type="submit">Submit suggestion</Button>
      </form>
    </div>
  );
}

function SelectGroupItems({ moduleId, label }: { moduleId: string; label: string }) {
  const moduleSteps = steps.filter((s) => s.moduleId === moduleId);
  return (
    <>
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {moduleSteps.map((s) => (
        <SelectItem key={s.id} value={s.id}>
          {s.title}
        </SelectItem>
      ))}
    </>
  );
}