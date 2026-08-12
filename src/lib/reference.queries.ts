import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type ReferenceDocumentRow = Database["public"]["Tables"]["reference_documents"]["Row"];
export type PresentationEntryRow =
  Database["public"]["Tables"]["presentation_reference_entries"]["Row"];
export type ReferenceDocumentType = Database["public"]["Enums"]["reference_document_type"];

/** One ordered section of a reference document (stored in the `sections` jsonb array). */
export type ReferenceSection = {
  title: string;
  /** Checklists only. */
  line_items?: { text: string; order: number }[];
  /** SOPs only. */
  body_text?: string | null;
  reference_photo_url?: string | null;
  video_url?: string | null;
};

export function docSections(doc: Pick<ReferenceDocumentRow, "sections">): ReferenceSection[] {
  const raw = doc.sections;
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (s): s is ReferenceSection => typeof s === "object" && s !== null,
  );
}

export function sectionLineItems(section: ReferenceSection) {
  return [...(section.line_items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const divisionLabels: Record<string, string> = {
  universal: "Company-Wide",
  market: "Markets",
  kitchen: "Kitchen",
  delivery: "Delivery",
};

export function divisionLabel(value: string) {
  return divisionLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Shared: Kitchen + Markets" — only meaningful when a doc is tagged to 2+ divisions. */
export function sharedLabel(departments: string[] | null) {
  if (!departments || departments.length < 2) return null;
  return `Shared: ${departments.map(divisionLabel).join(" + ")}`;
}

/**
 * Top-level grouping bucket for a document: a single division when it's tagged to
 * exactly one of market/kitchen/delivery, otherwise Company-Wide (universal,
 * untagged, or shared across 2+ divisions).
 */
export function divisionGroupLabel(departments: string[] | null): string {
  const list = departments ?? [];
  if (list.length === 0) return divisionLabel("universal");
  if (list.includes("universal")) return divisionLabel("universal");
  const specific = list.filter((d) => d === "market" || d === "kitchen" || d === "delivery");
  if (specific.length === 1) return divisionLabel(specific[0]!);
  return divisionLabel("universal");
}

export type SubCategoryFilter = {
  /** Only show docs whose sub_category matches one of these. */
  include?: string[];
  /** Hide docs whose sub_category matches one of these. */
  exclude?: string[];
};

function matchesSubCategory(value: string | null, filter?: SubCategoryFilter) {
  if (!filter) return true;
  const key = value?.trim() ?? "";
  if (filter.include && !filter.include.includes(key)) return false;
  if (filter.exclude && filter.exclude.includes(key)) return false;
  return true;
}

export function referenceDocumentsQueryOptions(
  documentType: ReferenceDocumentType,
  subCategoryFilter?: SubCategoryFilter,
) {
  return queryOptions({
    queryKey: ["reference-documents", documentType, subCategoryFilter ?? null],
    queryFn: async (): Promise<ReferenceDocumentRow[]> => {
      const { data, error } = await supabase
        .from("reference_documents")
        .select("*")
        .eq("document_type", documentType)
        .eq("is_deleted", false)
        .order("sub_category", { nullsFirst: false })
        .order("title");
      if (error) throw error;
      return (data ?? []).filter((d) => matchesSubCategory(d.sub_category, subCategoryFilter));
    },
  });
}

export function presentationEntriesQueryOptions() {
  return queryOptions({
    queryKey: ["presentation-entries"],
    queryFn: async (): Promise<PresentationEntryRow[]> => {
      const { data, error } = await supabase
        .from("presentation_reference_entries")
        .select("*")
        .eq("is_deleted", false)
        .order("category")
        .order("item_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Group rows by an arbitrary text key, preserving first-seen order. */
export function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = groups.get(k);
    if (bucket) bucket.push(row);
    else groups.set(k, [row]);
  }
  return [...groups.entries()];
}

/** A staff member sees docs tagged to their department (plus universal / untagged). */
export function visibleToDivision(departments: string[] | null, department: string | null) {
  if (!departments || departments.length === 0) return true;
  if (departments.includes("universal")) return true;
  if (!department) return false;
  return departments.includes(department);
}

/** A staff member sees docs tagged to their own location (plus untagged/shared). */
export function visibleToLocation(locationTag: string | null, employeeLocationId: string | null) {
  if (!locationTag) return true;
  if (!employeeLocationId) return false;
  return locationTag === employeeLocationId;
}

/**
 * Owners can save a checklist/SOP section edit directly. Managers submit the same
 * change through the existing suggestion queue instead — no direct write.
 */
export async function saveReferenceSections(input: {
  documentId: string;
  sections: ReferenceSection[];
  updatedBy: string | null;
}) {
  const { error } = await supabase
    .from("reference_documents")
    .update({
      sections: input.sections as unknown as Database["public"]["Tables"]["reference_documents"]["Row"]["sections"],
      updated_by: input.updatedBy,
    })
    .eq("id", input.documentId);
  if (error) throw error;
}

/** Structured proposed change stored on suggestion_queue.payload for deterministic apply. */
export type SuggestionPayload =
  | { type: "line_items"; sectionIndex: number; items: { text: string; order: number }[] }
  | { type: "section_body"; sectionIndex: number; title: string; body_text: string | null }
  | {
      type: "document_meta";
      title: string;
      subCategory: string | null;
      departments: string[];
      locationTag: string | null;
    }
  | {
      type: "new_document";
      documentType: "checklist" | "sop";
      title: string;
      subCategory: string | null;
      departments: string[];
      locationTag: string | null;
    }
  | { type: "delete_document" }
  | { type: "delete_module" };

/**
 * A General Manager cannot delete a reference document directly (the
 * guard_reference_document_delete trigger is Owner-only) — they ask instead.
 */
export async function submitReferenceDeleteRequest(input: {
  documentId: string;
  documentTitle: string;
  submittedBy: string;
}) {
  const { error } = await supabase.from("suggestion_queue").insert({
    reference_document_id: input.documentId,
    submitted_by: input.submittedBy,
    field_what: `Delete "${input.documentTitle}"`,
    field_how: null,
    field_how_you_know: null,
    payload: { type: "delete_document" } as unknown as Json,
    status: "pending",
  });
  if (error) throw error;
}

export async function submitReferenceSuggestion(input: {
  documentId: string;
  submittedBy: string;
  what: string;
  how: string | null;
  howYouKnow: string | null;
  payload?: SuggestionPayload;
}) {
  const { error } = await supabase.from("suggestion_queue").insert({
    reference_document_id: input.documentId,
    submitted_by: input.submittedBy,
    field_what: input.what,
    field_how: input.how,
    field_how_you_know: input.howYouKnow,
    payload: (input.payload ?? null) as unknown as Json,
    status: "pending",
  });
  if (error) throw error;
}

/** Owner-only direct edit of a document's own title / group / departments / location. */
export async function updateReferenceDocumentMeta(input: {
  id: string;
  title: string;
  subCategory: string | null;
  departments: string[];
  locationTag: string | null;
  updatedBy: string | null;
}) {
  const { error } = await supabase
    .from("reference_documents")
    .update({
      title: input.title,
      sub_category: input.subCategory,
      departments: input.departments,
      location_tag: input.locationTag,
      updated_by: input.updatedBy,
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function createPresentationEntry(input: {
  category: string;
  itemName: string;
  portionNote: string | null;
  department: string | null;
  updatedBy: string | null;
}) {
  const { error } = await supabase.from("presentation_reference_entries").insert({
    category: input.category,
    item_name: input.itemName,
    portion_note: input.portionNote,
    department: input.department,
    photo_url: null,
    updated_by: input.updatedBy,
  });
  if (error) throw error;
}

export const divisionOptions = ["universal", "market", "kitchen", "delivery"] as const;

export const locationOptions = [
  { value: "market_street", label: "Market Street" },
  { value: "carolina_beach_road", label: "Carolina Beach Road" },
] as const;

export function locationLabel(value: string | null) {
  if (!value) return "No specific location (shared)";
  return locationOptions.find((l) => l.value === value)?.label ?? value;
}

/** Owner-only direct create (reference_documents insert RLS is owner-tier). */
export async function createReferenceDocument(input: {
  documentType: ReferenceDocumentType;
  title: string;
  subCategory: string | null;
  departments: string[];
  locationTag?: string | null;
  updatedBy: string | null;
}) {
  const { error } = await supabase.from("reference_documents").insert({
    document_type: input.documentType,
    title: input.title,
    sub_category: input.subCategory,
    departments: input.departments,
    location_tag: input.locationTag ?? null,
    sections: [],
    content_status: "missing",
    updated_by: input.updatedBy,
  });
  if (error) throw error;
}

/**
 * Manager path for a brand-new document: no row to point at yet, so
 * reference_document_id stays null and the proposal lives in field_what.
 */
export async function submitNewDocumentSuggestion(input: {
  documentType: ReferenceDocumentType;
  submittedBy: string;
  title: string;
  subCategory: string | null;
  departments: string[];
  locationTag?: string | null;
  howYouKnow: string | null;
  payload?: SuggestionPayload;
}) {
  const label = input.documentType === "checklist" ? "checklist" : "SOP";
  const what = [
    `New ${label}: ${input.title}`,
    input.subCategory ? `Group: ${input.subCategory}` : null,
    `Departments: ${input.departments.map(divisionLabel).join(", ") || "—"}`,
    `Location: ${locationLabel(input.locationTag ?? null)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const { error } = await supabase.from("suggestion_queue").insert({
    submitted_by: input.submittedBy,
    field_what: what,
    field_how: null,
    field_how_you_know: input.howYouKnow,
    payload: (input.payload ?? null) as unknown as Json,
    status: "pending",
  });
  if (error) throw error;
}

export async function updatePresentationEntry(input: {
  id: string;
  category: string;
  itemName: string;
  portionNote: string | null;
  updatedBy: string | null;
}) {
  const { error } = await supabase
    .from("presentation_reference_entries")
    .update({
      category: input.category,
      item_name: input.itemName,
      portion_note: input.portionNote,
      updated_by: input.updatedBy,
    })
    .eq("id", input.id);
  if (error) throw error;
}

/** Owner-only soft delete — never a hard delete. Version history trigger logs the change. */
export async function softDeleteReferenceDocument(input: {
  id: string;
  deletedBy: string | null;
}) {
  const { error } = await supabase
    .from("reference_documents")
    .update({
      is_deleted: true,
      deleted_by: input.deletedBy,
      deleted_at: new Date().toISOString(),
      updated_by: input.deletedBy,
    })
    .eq("id", input.id);
  if (error) throw error;
}
