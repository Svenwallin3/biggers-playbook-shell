import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { bodyLines } from "@/lib/training.queries";
import { suggestionsQueryOptions, type SuggestionWithContext } from "@/lib/admin.queries";
import type { ReferenceSection, SuggestionPayload } from "@/lib/reference.queries";
import {
  decideSourcingDeleteRequest,
  pendingSourcingDeleteRequestsQueryOptions,
  SOURCING_DELETE_REQUESTS_KEY,
} from "@/lib/sourcing-delete.queries";

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

/** The approved body a suggestion becomes when it goes live. */
function suggestedBody(s: SuggestionWithContext) {
  const parts = [s.field_how?.trim() || s.field_what.trim()];
  if (s.field_how_you_know?.trim()) {
    parts.push(`Done right when: ${s.field_how_you_know.trim()}`);
  }
  return parts.filter(Boolean).join("\n");
}

function ApprovalsPage() {
  const { employee, loading, isGeneralManager } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = employee?.auth_tier === "owner";
  const canSeeRemovals = isOwner || isGeneralManager;
  const pendingQuery = useQuery({ ...suggestionsQueryOptions("pending"), enabled: isOwner });
  const removalQuery = useQuery({
    ...pendingSourcingDeleteRequestsQueryOptions(),
    enabled: canSeeRemovals,
  });
  const removals = removalQuery.data ?? [];
  const requesterIds = [...new Set(removals.map((r) => r.requested_by))];
  const requestersQuery = useQuery({
    queryKey: ["employees-by-id", requesterIds],
    enabled: canSeeRemovals && requesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email")
        .in("id", requesterIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decideRemoval = useMutation({
    mutationFn: async (input: {
      requestId: string;
      entryId: string;
      decision: "approved" | "rejected";
    }) => decideSourcingDeleteRequest({ ...input, reviewedBy: employee!.id }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: SOURCING_DELETE_REQUESTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["sourcing-board"] });
      toast.success(
        vars.decision === "approved"
          ? "Approved — the entry is off the Sourcing Board."
          : "Rejected — the entry stays on the board.",
      );
    },
    onError: (error: Error) => toast.error("Couldn't record that", { description: error.message }),
  });

  const decide = useMutation({
    mutationFn: async (input: { s: SuggestionWithContext; decision: "approved" | "rejected" }) => {
      const { s, decision } = input;
      if (decision === "approved" && s.step) {
        // Applying the edit fires the steps version trigger, so the prior
        // content is captured in version_history automatically.
        const { error: stepError } = await supabase
          .from("steps")
          .update({
            title: s.field_what.trim() || s.step.title,
            content_body: suggestedBody(s),
            content_status: "ready",
          })
          .eq("id", s.step.id);
        if (stepError) throw stepError;
      }

      if (decision === "approved" && !s.step) {
        const payload = s.payload as SuggestionPayload | null;

        if (
          (payload?.type === "line_items" || payload?.type === "section_body") &&
          s.reference_document_id
        ) {
          const { data: current, error: fetchError } = await supabase
            .from("reference_documents")
            .select("sections")
            .eq("id", s.reference_document_id)
            .single();
          if (fetchError) throw fetchError;
          const sections = (
            Array.isArray(current.sections) ? [...current.sections] : []
          ) as ReferenceSection[];
          const existing = sections[payload.sectionIndex];
          if (existing) {
            sections[payload.sectionIndex] =
              payload.type === "line_items"
                ? { ...existing, line_items: payload.items }
                : { ...existing, title: payload.title, body_text: payload.body_text };
          }
          const { error } = await supabase
            .from("reference_documents")
            .update({ sections: sections as unknown as Json })
            .eq("id", s.reference_document_id);
          if (error) throw error;
        } else if (payload?.type === "document_meta" && s.reference_document_id) {
          const { error } = await supabase
            .from("reference_documents")
            .update({
              title: payload.title,
              sub_category: payload.subCategory,
              departments: payload.departments,
              location_tag: payload.locationTag,
            })
            .eq("id", s.reference_document_id);
          if (error) throw error;
        } else if (payload?.type === "new_document") {
          const { error } = await supabase.from("reference_documents").insert({
            document_type: payload.documentType,
            title: payload.title,
            sub_category: payload.subCategory,
            departments: payload.departments,
            location_tag: payload.locationTag,
            sections: [],
            content_status: "missing",
          });
          if (error) throw error;
        }
      }
      const { error } = await supabase
        .from("suggestion_queue")
        .update({
          status: decision,
          reviewed_by: employee!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      void queryClient.invalidateQueries({ queryKey: ["content-tree"] });
      void queryClient.invalidateQueries({ queryKey: ["module"] });
      void queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
      toast.success(
        vars.decision === "approved"
          ? "Approved — the change is live and the previous version is logged."
          : "Rejected — content untouched, the suggestion is kept on record.",
      );
    },
    onError: (error: Error) => toast.error("Couldn't record that", { description: error.message }),
  });

  if (loading) return null;

  if (!canSeeRemovals) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The approval queue is for Owners and General Managers.
        </CardContent>
      </Card>
    );
  }

  const pending = pendingQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOwner
            ? "Owner-only. Regular managers editing their own department route through here — General Managers and Owners edit directly."
            : "Sourcing Board removal requests from your managers come here for your approval."}
        </p>
      </div>

      {isOwner && pendingQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading suggestions…</p>
      ) : null}
      {isOwner && pendingQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load the queue.</p>
      ) : null}

      {isOwner && !pendingQuery.isPending && pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing pending. Queue is clear.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-5">
        {(isOwner ? pending : []).map((s) => {
          const current = bodyLines({ content_body: s.step?.content_body ?? null });
          const isFlag = s.field_what.startsWith("FLAG:");
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {s.step?.title ?? s.reference_document?.title ?? s.field_what}
                  </CardTitle>
                  <Badge variant={isFlag ? "outline" : "secondary"}>
                    {isFlag ? "Staff flag" : "Pending"}
                  </Badge>
                </div>
                <CardDescription>
                  {s.step
                    ? `${s.step.module?.track?.name} · ${s.step.module?.name}`
                    : s.reference_document
                      ? `Reference Library · ${s.reference_document.document_type === "checklist" ? "Checklist" : "SOP"}`
                      : "New document"}{" "}
                  — submitted by{" "}
                  {s.submitter?.full_name ?? s.submitter?.email ?? "unknown"} (
                  {s.submitter?.auth_tier}) on {new Date(s.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Current
                    </p>
                    {current.length ? (
                      <ul className="space-y-1 text-sm">
                        {current.map((line, i) => (
                          <li key={i} className="text-muted-foreground">
                            {i + 1}. {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No content on this step yet.</p>
                    )}
                  </div>
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Suggested
                    </p>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">What&apos;s the step</dt>
                        <dd>{s.field_what}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">How it&apos;s done</dt>
                        <dd>{s.field_how ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          How you know it&apos;s done right
                        </dt>
                        <dd>{s.field_how_you_know ?? "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending || (!s.step && !s.payload)}
                    onClick={() => decide.mutate({ s, decision: "approved" })}
                  >
                    Approve &amp; publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ s, decision: "rejected" })}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">Sourcing Board removal requests</h2>
        {!removalQuery.isPending && removals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing pending. Queue is clear.
            </CardContent>
          </Card>
        ) : null}
        {removals.map((r) => {
            const requester = requestersQuery.data?.find((e) => e.id === r.requested_by);
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-base">{r.product_snapshot}</CardTitle>
                  <CardDescription>
                    Requested by {requester?.full_name ?? requester?.email ?? "unknown"} on{" "}
                    {new Date(r.requested_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {r.reason ? <p className="text-sm">{r.reason}</p> : null}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={decideRemoval.isPending}
                      onClick={() =>
                        decideRemoval.mutate({
                          requestId: r.id,
                          entryId: r.entry_id,
                          decision: "approved",
                        })
                      }
                    >
                      Approve removal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decideRemoval.isPending}
                      onClick={() =>
                        decideRemoval.mutate({
                          requestId: r.id,
                          entryId: r.entry_id,
                          decision: "rejected",
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
