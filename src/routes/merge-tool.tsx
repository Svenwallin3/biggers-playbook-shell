import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { mergeProfiles, type MergeProfile } from "@/data/mockCompliance";
import { steps } from "@/data/mockTraining";

export const Route = createFileRoute("/merge-tool")({
  head: () => ({
    meta: [
      { title: "Account Merge Tool — Biggers Training" },
      {
        name: "description",
        content:
          "Owner-only tool to find duplicate employee profiles and preview merging their training progress into a single record.",
      },
      { property: "og:title", content: "Account Merge Tool — Biggers Training" },
      {
        property: "og:description",
        content: "Preview and confirm merging duplicate Biggers Market employee profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MergeToolPage,
});

function stepTitle(id: string) {
  return steps.find((s) => s.id === id)?.title ?? id;
}

function MergeToolPage() {
  const [query, setQuery] = useState("");
  const [primary, setPrimary] = useState<MergeProfile | null>(null);
  const [duplicate, setDuplicate] = useState<MergeProfile | null>(null);
  const [merged, setMerged] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mergeProfiles;
    return mergeProfiles.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [query]);

  const preview = useMemo(() => {
    if (!primary || !duplicate) return null;
    const stepIds = [...new Set([...primary.completedStepIds, ...duplicate.completedStepIds])];
    const overlap = primary.completedStepIds.filter((id) =>
      duplicate.completedStepIds.includes(id),
    );
    return {
      stepIds,
      overlap,
      signoffs: [...primary.signoffs, ...duplicate.signoffs],
    };
  }, [primary, duplicate]);

  function pick(p: MergeProfile) {
    setMerged(false);
    if (!primary || (primary && duplicate)) {
      setPrimary(p);
      setDuplicate(null);
      return;
    }
    if (p.id === primary.id) return;
    setDuplicate(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account merge tool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner-only. Combine two profiles for the same person into one record. Nothing is deleted —
          the duplicate is kept, hidden, and logged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {!primary ? "Step 1 — pick the profile to keep" : !duplicate ? "Step 2 — pick the duplicate" : "Profiles selected"}
          </CardTitle>
          <CardDescription>Search by name or email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q" className="sr-only">
              Search employees
            </Label>
            <Input
              id="q"
              value={query}
              maxLength={80}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jordan, hale, @biggersmarket.com…"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((p) => {
              const isPrimary = primary?.id === p.id;
              const isDup = duplicate?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    isPrimary || isDup ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    {isPrimary ? <Badge>Keep</Badge> : null}
                    {isDup ? <Badge variant="secondary">Duplicate</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.department} · {p.status} · created {p.createdOn} · last seen {p.lastSeen}
                  </p>
                </button>
              );
            })}
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No profiles match that search.</p>
            ) : null}
          </div>
          {primary ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPrimary(null);
                setDuplicate(null);
                setMerged(false);
              }}
            >
              Clear selection
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {primary && duplicate && preview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Merge preview</CardTitle>
            <CardDescription>
              {duplicate.name} would be folded into {primary.name}. Review before confirming.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileColumn label="Keeping" p={primary} />
              <ProfileColumn label="Merging in" p={duplicate} muted />
            </div>

            <Separator />

            <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Result on {primary.name}
              </p>
              <p className="mt-2 text-sm">
                {preview.stepIds.length} completed steps ({preview.overlap.length} already shared,
                counted once) and {preview.signoffs.length} trainer sign-offs.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {preview.stepIds.map((id) => (
                  <li key={id}>• {stepTitle(id)}</li>
                ))}
              </ul>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {preview.signoffs.map((s, i) => (
                  <li key={i}>
                    ✓ {s.skill} — {s.by}, {s.on}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {duplicate.email} becomes an alternate login for {primary.name}. The duplicate
                profile is hidden, not deleted.
              </p>
            </div>

            {merged ? (
              <p className="text-sm font-medium">
                Merged (mock) — {duplicate.name} folded into {primary.name}.
              </p>
            ) : (
              <Button
                onClick={() => {
                  setMerged(true);
                  toast.success("Profiles merged — logged and reversible.");
                }}
              >
                Confirm merge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProfileColumn({ label, p, muted }: { label: string; p: MergeProfile; muted?: boolean }) {
  return (
    <div className={`rounded-md border border-border p-3 ${muted ? "opacity-70" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{p.name}</p>
      <p className="text-xs text-muted-foreground">{p.email}</p>
      <p className="mt-2 text-sm">{p.completedStepIds.length} completed steps</p>
      <p className="text-sm">{p.signoffs.length} sign-offs</p>
    </div>
  );
}