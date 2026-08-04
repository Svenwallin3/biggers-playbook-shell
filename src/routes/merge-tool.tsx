import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  employeeStatsQueryOptions,
  employeesQueryOptions,
  type EmployeeRow,
} from "@/lib/admin.queries";

export const Route = createFileRoute("/merge-tool")({
  head: () => ({
    meta: [
      { title: "Merge Accounts — Biggers Training" },
      {
        name: "description",
        content:
          "Owner tool to combine two duplicate Biggers Market employee accounts, moving all training progress onto one record.",
      },
      { property: "og:title", content: "Merge Accounts — Biggers Training" },
      {
        property: "og:description",
        content: "Preview and confirm merging duplicate employee records without deleting data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MergeToolPage,
});

function EmployeePicker({
  label,
  employees,
  selected,
  onSelect,
}: {
  label: string;
  employees: EmployeeRow[];
  selected: EmployeeRow | null;
  onSelect: (e: EmployeeRow | null) => void;
}) {
  const [term, setTerm] = useState("");
  const matches = term.trim()
    ? employees
        .filter((e) =>
          `${e.full_name ?? ""} ${e.email}`.toLowerCase().includes(term.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium">{selected.full_name ?? "No name on file"}</p>
            <p className="text-xs text-muted-foreground">{selected.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected.auth_tier} · {selected.path ?? "no path"} · {selected.status}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onSelect(null);
              setTerm("");
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name or email"
          />
          {matches.length ? (
            <ul className="rounded-md border border-border">
              {matches.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => onSelect(e)}
                  >
                    <span className="font-medium">{e.full_name ?? "No name"}</span>{" "}
                    <span className="text-muted-foreground">{e.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

function MergeToolPage() {
  const { employee, loading } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = employee?.auth_tier === "owner";
  const employeesQuery = useQuery({ ...employeesQueryOptions(), enabled: isOwner });

  const [primary, setPrimary] = useState<EmployeeRow | null>(null);
  const [duplicate, setDuplicate] = useState<EmployeeRow | null>(null);

  const primaryStats = useQuery(employeeStatsQueryOptions(primary?.id));
  const duplicateStats = useQuery(employeeStatsQueryOptions(duplicate?.id));

  const merge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("merge_employees", {
        _primary: primary!.id,
        _duplicate: duplicate!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Merged — the duplicate is soft-deleted, never removed.");
      setDuplicate(null);
    },
    onError: (error: Error) => toast.error("Merge failed", { description: error.message }),
  });

  if (loading) return null;
  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The merge tool is Owner-only.
        </CardContent>
      </Card>
    );
  }

  const employees = (employeesQuery.data ?? []).filter((e) => !e.is_deleted);
  const sameRecord = primary && duplicate && primary.id === duplicate.id;
  const mergedSteps = new Set([
    ...(primaryStats.data?.completedStepIds ?? []),
    ...(duplicateStats.data?.completedStepIds ?? []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merge accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner-only. Combines a duplicate account into the primary one: progress, quiz attempts and
          authorship move over, then the duplicate is soft-deleted. Nothing is ever hard-deleted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keep this record</CardTitle>
            <CardDescription>Everything is merged onto this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePicker
              label="Primary employee"
              employees={employees}
              selected={primary}
              onSelect={setPrimary}
            />
            {primary ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {primaryStats.data?.completedStepIds.length ?? 0} completed steps ·{" "}
                {primaryStats.data?.quizAttempts ?? 0} quiz attempts ·{" "}
                {primaryStats.data?.suggestions ?? 0} suggestions
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Merge in this one</CardTitle>
            <CardDescription>This account is retired after the merge.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePicker
              label="Duplicate employee"
              employees={employees}
              selected={duplicate}
              onSelect={setDuplicate}
            />
            {duplicate ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {duplicateStats.data?.completedStepIds.length ?? 0} completed steps ·{" "}
                {duplicateStats.data?.quizAttempts ?? 0} quiz attempts ·{" "}
                {duplicateStats.data?.suggestions ?? 0} suggestions
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {primary && duplicate && !sameRecord ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              What {primary.full_name ?? primary.email} looks like after the merge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Completed steps</p>
                <p className="font-medium">{mergedSteps.size} (de-duplicated)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quiz attempts</p>
                <p className="font-medium">
                  {(primaryStats.data?.quizAttempts ?? 0) + (duplicateStats.data?.quizAttempts ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suggestions authored</p>
                <p className="font-medium">
                  {(primaryStats.data?.suggestions ?? 0) + (duplicateStats.data?.suggestions ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duplicate record</p>
                <Badge variant="outline">Soft-deleted, restorable</Badge>
              </div>
            </div>

            <Separator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={merge.isPending}>
                  {merge.isPending ? "Merging…" : "Merge accounts"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Merge these two accounts?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Progress, quiz attempts and authored records move from{" "}
                    {duplicate.full_name ?? duplicate.email} onto{" "}
                    {primary.full_name ?? primary.email}. The duplicate is marked merged and hidden,
                    not deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => merge.mutate()}>Merge</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}

      {sameRecord ? (
        <p className="text-sm text-destructive">Pick two different employee records.</p>
      ) : null}
    </div>
  );
}
