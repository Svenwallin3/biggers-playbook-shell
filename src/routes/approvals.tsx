import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { type SuggestionWithContext } from "@/lib/admin.queries";
import { bucketFor, useApprovalsData } from "@/lib/approvals";
import type { ReferenceSection, SuggestionPayload } from "@/lib/reference.queries";
import {
  decideSourcingDeleteRequest,
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

function displayWhat(text: string) {
  return text.replace(/^FLAG:\s*/, "");
}

function ApprovalsPage() {
  const { employee, loading, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const { canView, suggestions, removals: removalQuery, feedback, reference, ownerOnly, removalRows: removals } =
    useApprovalsData();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requesterIds = [...new Set(removals.map((r) => r.requested_by))];
  const requestersQuery = useQuery({
    queryKey: ["employees-by-id", requesterIds],
    enabled: canView && requesterIds.length > 0,
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
          ? "Approved. The entry is off the Sourcing Board."
          : "Rejected. The entry stays on the board.",
      );
    },
    onError: (error: Error) => toast.error("Couldn't record that", { description: error.message }),
  });

  /** Suggestions/flags: status only. Never touches training content. */
  const resolveFeedback = useMutation({
    mutationFn: async (input: { s: SuggestionWithContext; decision: "approved" | "rejected" }) => {
      const note = notes[input.s.id]?.trim();
      const { error } = await supabase
        .from("suggestion_queue")
        .update({
          status: input.decision,
          reviewed_by: employee!.id,
          reviewed_at: new Date().toISOString(),
          decision_notes: note ? note : null,
        })
        .eq("id", input.s.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success(vars.decision === "approved" ? "Marked done" : "Dismissed");
    },
    onError: (error: Error) => toast.error("Couldn't record that", { description: error.message }),
  });

  /** Reference document changes and Owner-only requests (existing apply logic). */
  const decide = useMutation({
    mutationFn: async (input: { s: SuggestionWithContext; decision: "approved" | "rejected" }) => {
      const { s, decision } = input;
      const bucket = bucketFor(s);
      if (decision === "approved" && (bucket === "reference" || bucket === "owner")) {
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
        } else if (payload?.type === "delete_document" && s.reference_document_id) {
          const { error } = await supabase
            .from("reference_documents")
            .update({
              is_deleted: true,
              deleted_by: employee!.id,
              deleted_at: new Date().toISOString(),
            })
            .eq("id", s.reference_document_id);
          if (error) throw error;
        } else if (payload?.type === "delete_module" && s.module_id) {
          const { error } = await supabase
            .from("modules")
            .update({
              is_deleted: true,
              deleted_by: employee!.id,
              deleted_at: new Date().toISOString(),
            })
            .eq("id", s.module_id);
          if (error) throw error;
        } else if (payload?.type === "delete_track" && payload.track_id) {
          const { error } = await supabase
            .from("tracks")
            .update({
              is_deleted: true,
              deleted_by: employee!.id,
              deleted_at: new Date().toISOString(),
            })
            .eq("id", payload.track_id);
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
          ? "Approved and applied."
          : "Rejected. Nothing was changed.",
      );
    },
    onError: (error: Error) => toast.error("Couldn't record that", { description: error.message }),
  });

  if (loading) return null;

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          The approval queue is for Owners and General Managers.
        </CardContent>
      </Card>
    );
  }

  const busy = decide.isPending || resolveFeedback.isPending;
  const who = (s: SuggestionWithContext) =>
    s.submitter?.full_name ?? s.submitter?.email ?? "unknown";

  const decisionCard = (s: SuggestionWithContext, approveLabel: string) => {
    const payload = s.payload as SuggestionPayload | null;
    const isDelete =
      payload?.type === "delete_document" ||
      payload?.type === "delete_module" ||
      payload?.type === "delete_track";
    const target =
      payload?.type === "delete_module"
        ? (s.module?.name ?? "module")
        : payload?.type === "delete_track"
          ? s.field_what.replace(/^Delete section "(.*)"$/, "$1")
          : payload?.type === "new_document"
            ? payload.title
            : (s.reference_document?.title ?? s.field_what);
    const kind =
      payload?.type === "delete_module"
        ? "Delete module"
        : payload?.type === "delete_track"
          ? "Delete section"
          : payload?.type === "delete_document"
            ? "Delete document"
            : payload?.type === "new_document"
              ? "New document"
              : "Reference Library";
    return (
      <Card key={s.id}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{target}</CardTitle>
            <Badge variant="outline">{kind}</Badge>
          </div>
          <CardDescription>
            Sent by {who(s)} on {new Date(s.created_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDelete ? (
            <p className="text-sm text-muted-foreground">
              Approving hides “{target}” from everyone. Nothing is permanently erased; it can be
              restored later.
            </p>
          ) : s.field_how ? (
            <p className="whitespace-pre-wrap text-sm">{s.field_how}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => decide.mutate({ s, decision: "approved" })}
            >
              {approveLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => decide.mutate({ s, decision: "rejected" })}
            >
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
      </div>

      {suggestions.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load the queue.</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Suggestions and flags</h2>
        {suggestions.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : feedback.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nothing waiting. Suggestions from your team show up here.
            </CardContent>
          </Card>
        ) : (
          feedback.map((s) => {
            const mod = s.step?.module;
            return (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {s.step?.title ?? displayWhat(s.field_what)}
                  </CardTitle>
                  <CardDescription>
                    {mod ? `${mod.track?.name ?? ""} · ${mod.name}` : (s.module?.name ?? "")}
                    {mod || s.module ? " · " : ""}
                    From {who(s)} on {new Date(s.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {s.field_how?.trim() || displayWhat(s.field_what)}
                  </p>
                  <Input
                    placeholder="Optional note"
                    maxLength={300}
                    value={notes[s.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {mod ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          to="/preview"
                          search={{
                            track: mod.track_id,
                            module: mod.id,
                            step: s.step!.id,
                            branch: mod.path_id ?? undefined,
                          }}
                        >
                          Open step
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => resolveFeedback.mutate({ s, decision: "approved" })}
                    >
                      Mark done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => resolveFeedback.mutate({ s, decision: "rejected" })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {reference.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Reference document changes</h2>
          {reference.map((s) => decisionCard(s, "Approve and apply"))}
        </section>
      ) : null}

      {isOwner && ownerOnly.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Needs Owner approval</h2>
          {ownerOnly.map((s) => decisionCard(s, "Approve"))}
        </section>
      ) : null}

      {removals.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Sourcing Board removal requests</h2>
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
        </section>
      ) : null}
    </div>
  );
}
