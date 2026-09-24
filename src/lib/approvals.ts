import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { suggestionsQueryOptions, type SuggestionWithContext } from "@/lib/admin.queries";
import { pendingSourcingDeleteRequestsQueryOptions } from "@/lib/sourcing-delete.queries";

export type ApprovalBucket = "feedback" | "reference" | "owner" | "other";

const REFERENCE_TYPES = ["line_items", "section_body", "document_meta"];
const OWNER_TYPES = ["delete_module", "delete_track", "delete_document", "new_document"];

export function bucketFor(s: SuggestionWithContext): ApprovalBucket {
  const type = (s.payload as { type?: string } | null)?.type;
  if (!type || type === "feedback") return "feedback";
  if (REFERENCE_TYPES.includes(type)) return "reference";
  if (OWNER_TYPES.includes(type)) return "owner";
  return "other";
}

/** Shared data for the Approvals page and the nav badge, so both counts agree. */
export function useApprovalsData() {
  const { isOwner, isGeneralManager } = useAuth();
  const canView = isOwner || isGeneralManager;
  const suggestions = useQuery({ ...suggestionsQueryOptions("pending"), enabled: canView });
  const removals = useQuery({ ...pendingSourcingDeleteRequestsQueryOptions(), enabled: canView });

  const all = suggestions.data ?? [];
  const feedback = all.filter((s) => bucketFor(s) === "feedback");
  const reference = all.filter((s) => bucketFor(s) === "reference");
  const ownerOnly = isOwner ? all.filter((s) => bucketFor(s) === "owner") : [];
  const removalRows = removals.data ?? [];
  const count = canView
    ? feedback.length + reference.length + ownerOnly.length + removalRows.length
    : 0;

  return { canView, suggestions, removals, feedback, reference, ownerOnly, removalRows, count };
}
