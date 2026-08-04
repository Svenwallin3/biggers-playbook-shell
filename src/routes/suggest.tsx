import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { contentTreeQueryOptions } from "@/lib/admin.queries";

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
  const { isManagerOrOwner, loading, employee } = useAuth();
  const treeQuery = useQuery({ ...contentTreeQueryOptions(), enabled: isManagerOrOwner });

  const [stepId, setStepId] = useState("");
  const [what, setWhat] = useState("");
  const [how, setHow] = useState("");
  const [know, setKnow] = useState("");
  const [nudged, setNudged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const steps = (treeQuery.data?.steps ?? []).filter((s) => !s.is_deleted);
  const modules = (treeQuery.data?.modules ?? []).filter((m) => !m.is_deleted);
  const selectedStep = steps.find((s) => s.id === stepId);
  const thin = how.trim() === "" || know.trim() === "";

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suggestion_queue").insert({
        step_id: stepId,
        module_id: selectedStep?.module_id ?? null,
        submitted_by: employee!.id,
        field_what: what.trim(),
        field_how: how.trim() || null,
        field_how_you_know: know.trim() || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Suggestion sent to the Owner approval queue.");
    },
    onError: (error: Error) =>
      toast.error("Couldn't submit that suggestion", { description: error.message }),
  });

  if (loading) return null;

  if (!isManagerOrOwner) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <Card>
          <CardHeader>
            <CardTitle>Spotted something off?</CardTitle>
            <CardDescription>
              Suggestions are submitted by managers. As staff, use the Flag action on any training
              step — it routes straight to your manager, who can turn it into a suggestion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">Back to today&apos;s training</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stepId) {
      toast.error("Pick the step this is about first.");
      return;
    }
    if (what.trim() === "") {
      toast.error("Tell us what the step is first.");
      return;
    }
    if (thin && !nudged) {
      setNudged(true);
      return;
    }
    submit.mutate();
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Suggestion submitted</CardTitle>
            <CardDescription>
              Your suggestion for “{selectedStep?.title}” is in the Owner approval queue. Nothing
              changes in the training content until it&apos;s approved.
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
          Managers can suggest a change to any step, company-wide — Market, Kitchen, or Universal. An
          Owner approves before anything goes live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label>Which step?</Label>
              <Select value={stepId} onValueChange={setStepId} disabled={treeQuery.isPending}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={treeQuery.isPending ? "Loading content…" : "Pick a step"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectGroup key={m.id}>
                      <SelectLabel>
                        {m.track?.name} · {m.name}
                      </SelectLabel>
                      {steps
                        .filter((s) => s.module_id === m.id)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="what">1. What&apos;s the step?</Label>
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
              <Label htmlFor="know">3. How do you know it&apos;s done right?</Label>
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

        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit suggestion"}
        </Button>
      </form>
    </div>
  );
}
