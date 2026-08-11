import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  allOpenDeliveryIssuesQueryOptions,
  resolveDeliveryIssue,
  type DeliveryIssueWithPeople,
} from "@/lib/delivery.queries";

const title = "Delivery Issues — Biggers Training Platform";
const description = "Company-wide list of open delivery issues awaiting resolution.";

export const Route = createFileRoute("/delivery-issues")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliveryIssuesPage,
});

function personName(p: DeliveryIssueWithPeople["reporter"]) {
  if (!p) return "—";
  return p.full_name ?? p.email;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DeliveryIssuesPage() {
  const { loading, isManagerOrOwner } = useAuth();
  const queryClient = useQueryClient();
  const issuesQuery = useQuery(allOpenDeliveryIssuesQueryOptions());

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveDeliveryIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-issues"] });
      toast.success("Issue marked resolved");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not resolve issue"),
  });

  if (loading) return null;
  if (!isManagerOrOwner) return <Navigate to="/" replace />;

  const issues = issuesQuery.data ?? [];

  return (
    <div className="admin-dense space-y-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Delivery Issues</h1>
        <p className="text-sm text-muted-foreground">
          Every open delivery issue across the company, newest first.
        </p>
      </header>

      {issuesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open delivery issues</p>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {issues.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="space-y-2 py-4">
                  <p className="font-display text-sm font-semibold">{issue.product_vendor}</p>
                  <p className="text-sm leading-relaxed">{issue.issue_description}</p>
                  <p className="text-xs text-muted-foreground">
                    Reported by {personName(issue.reporter)} · Assigned to{" "}
                    {personName(issue.assignee)} · {formatDate(issue.created_at)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(issue.id)}
                  >
                    Resolve
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Reported by</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="max-w-md">
                      <span className="font-semibold">{issue.product_vendor}</span>
                      <span className="block text-muted-foreground">
                        {issue.issue_description}
                      </span>
                    </TableCell>
                    <TableCell>{personName(issue.reporter)}</TableCell>
                    <TableCell>{personName(issue.assignee)}</TableCell>
                    <TableCell>{formatDate(issue.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate(issue.id)}
                      >
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
