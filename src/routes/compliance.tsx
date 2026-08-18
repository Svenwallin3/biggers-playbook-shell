import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import {
  assignmentsQueryOptions,
  endAssignableModuleAssignment,
} from "@/lib/admin.queries";
import { signoffBacklogQueryOptions } from "@/lib/backlog.queries";

const departmentLabels: Record<string, string> = {
  universal: "Unassigned / Universal",
  market: "Market",
  kitchen: "Kitchen",
  delivery: "Delivery",
};

function SignoffBacklogSection() {
  const query = useQuery(signoffBacklogQueryOptions());
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overdue sign-off backlog</CardTitle>
        <CardDescription>
          Trainer sign-offs and Day 4 supervised practice steps an employee has been waiting on for
          more than 48 hours, grouped by department. Pattern view — not a per-person alert.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading backlog…</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Couldn&apos;t load the sign-off backlog.</p>
        ) : !data || data.totalOverdue === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sign-offs have been waiting longer than 48 hours.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold">{data.totalOverdue}</span> overdue sign-off
              {data.totalOverdue === 1 ? "" : "s"} across {data.groups.length} department
              {data.groups.length === 1 ? "" : "s"}.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Division</TableHead>
                  <TableHead>Manager(s)</TableHead>
                  <TableHead>Overdue sign-offs</TableHead>
                  <TableHead>Longest wait</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.groups.map((group) => {
                  const days = group.longest
                    ? Math.floor(group.longest.hoursWaiting / 24)
                    : 0;
                  return (
                    <TableRow key={group.department}>
                      <TableCell className="font-medium">
                        {departmentLabels[group.department] ?? group.department}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {group.managers.length ? group.managers.join(", ") : "No manager assigned"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.overdueCount >= 3 ? "destructive" : "secondary"}>
                          {group.overdueCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {group.longest ? (
                          <>
                            {days >= 1
                              ? `${days} day${days === 1 ? "" : "s"}`
                              : `${Math.round(group.longest.hoursWaiting)} hours`}{" "}
                            — {group.longest.employee.full_name ?? group.longest.employee.email} ·{" "}
                            {group.longest.step.title}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Restricted Training — Biggers Training" },
      {
        name: "description",
        content:
          "Read-only view of restricted, assignable training modules at Biggers Market and each employee's completion status.",
      },
      { property: "og:title", content: "Restricted Training — Biggers Training" },
      {
        property: "og:description",
        content: "Who is assigned to restricted modules, and how far along they are.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  const { employee, isManagerOrOwner, isOwner, isGeneralManager, loading } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ ...assignmentsQueryOptions(), enabled: isManagerOrOwner });
  const canAssign = isGeneralManager || isOwner;

  const endAssignment = useMutation({
    mutationFn: (id: string) =>
      endAssignableModuleAssignment({ id, actorId: employee?.id ?? null }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment ended — the record is kept, not deleted.");
    },
    onError: (error: Error) => toast.error("Couldn't end it", { description: error.message }),
  });

  if (loading) return null;
  if (!isManagerOrOwner) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          This view is for managers and owners.
        </CardContent>
      </Card>
    );
  }

  const rows = query.data?.rows ?? [];
  const completion = query.data?.completion;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Restricted training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only. Shows assignable modules (forklift, alcohol receiving, and similar) and how far
          each assigned employee has gotten. Certified Food Protection Manager (CFPM) and ServSafe
          coverage is tracked manually outside the app for now.
        </p>
      </div>

      {isOwner ? <SignoffBacklogSection /> : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Assignable module completion</CardTitle>
            <CardDescription>
              {rows.length} active assignment{rows.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {query.isPending ? (
            <p className="text-sm text-muted-foreground">Loading assignments…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No restricted modules have been assigned yet.
            </p>
          ) : (
            <>
            <ul className="space-y-3 md:hidden">
              {rows.map((row) => {
                const c = completion?.get(row.id) ?? { done: 0, total: 0 };
                const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                const complete = c.total > 0 && c.done === c.total;
                const overdue = !complete && !!row.due_date && row.due_date < today;
                return (
                  <li key={row.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {row.employee?.full_name ?? row.employee?.email ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.module?.name ?? "—"}
                          {row.module?.track ? ` · ${row.module.track.name}` : ""}
                        </p>
                      </div>
                      {complete ? (
                        <Badge>Certified</Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="secondary">In progress</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {c.done}/{c.total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Due {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                      </span>
                      {canAssign ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={endAssignment.isPending}
                          onClick={() => endAssignment.mutate(row.id)}
                        >
                          End assignment
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  {canAssign ? <TableHead className="text-right">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const c = completion?.get(row.id) ?? { done: 0, total: 0 };
                  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                  const complete = c.total > 0 && c.done === c.total;
                  const overdue = !complete && !!row.due_date && row.due_date < today;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.employee?.full_name ?? row.employee?.email ?? "Unknown"}
                      </TableCell>
                      <TableCell>{row.module?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.module?.track?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.due_date ? new Date(row.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {c.done}/{c.total}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {complete ? (
                          <Badge>Certified</Badge>
                        ) : overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="secondary">In progress</Badge>
                        )}
                      </TableCell>
                      {canAssign ? (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={endAssignment.isPending}
                            onClick={() => endAssignment.mutate(row.id)}
                          >
                            End assignment
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
