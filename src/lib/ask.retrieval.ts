import { supabase } from "@/integrations/supabase/client";

export type AskSource = {
  ref: string;
  kind: "step" | "module" | "sourcing";
  label: string;
  sublabel: string;
  text: string;
  moduleId?: string;
  stepId?: string;
};

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "what", "where", "when",
  "how", "why", "who", "which", "again", "from", "for", "of", "to", "in", "on", "at", "and",
  "or", "our", "we", "my", "it", "its", "that", "this", "there", "customer",
  "customers", "asking", "rule", "about", "can", "should", "any", "get", "with",
]);

function keywords(question: string) {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, 6);
}

function like(term: string) {
  return `%${term.replace(/[%_]/g, "")}%`;
}

/**
 * Keyword retrieval over the same indexed content the Search screen covers.
 * Runs through the browser Supabase client, so RLS applies as the signed-in user.
 */
export async function retrieveContext(question: string): Promise<AskSource[]> {
  const terms = keywords(question);
  if (!terms.length) return [];

  const orFor = (columns: string[]) =>
    terms.flatMap((t) => columns.map((c) => `${c}.ilike.${like(t)}`)).join(",");

  const [stepRes, moduleRes, sourcingRes] = await Promise.all([
    supabase
      .from("steps")
      .select("*, module:modules(id,name,path)")
      .eq("is_deleted", false)
      .or(orFor(["title", "content_body"]))
      .limit(25),
    supabase
      .from("modules")
      .select("id,name,description,path")
      .eq("is_deleted", false)
      .or(orFor(["name", "description", "path"]))
      .limit(10),
    supabase
      .from("sourcing_board_entries")
      .select("*")
      .eq("is_deleted", false)
      .or(orFor(["product", "supplier", "region", "notes", "seasonality", "category"]))
      .limit(15),
  ]);

  if (stepRes.error) throw stepRes.error;
  if (moduleRes.error) throw moduleRes.error;
  if (sourcingRes.error) throw sourcingRes.error;

  const sources: AskSource[] = [];

  for (const row of sourcingRes.data ?? []) {
    const r = row as Record<string, unknown>;
    const parts = [
      `Product: ${r["product"]}`,
      r["supplier"] ? `Supplier/farm: ${r["supplier"]}` : "",
      r["region"] ? `Origin/region: ${r["region"]}` : "",
      r["category"] ? `Category: ${r["category"]}` : "",
      r["seasonality"] ? `Typical season: ${r["seasonality"]}` : "",
      r["notes"] ? `Notes: ${r["notes"]}` : "",
    ].filter(Boolean);
    sources.push({
      ref: `sourcing:${String(r["id"])}`,
      kind: "sourcing",
      label: String(r["product"]),
      sublabel: "Sourcing Board",
      text: parts.join("\n"),
    });
  }

  for (const row of stepRes.data ?? []) {
    const r = row as Record<string, unknown>;
    const status = String(r["content_status"] ?? "");
    // Never answer from placeholder content.
    if (status === "missing" || status === "blocked") continue;
    const mod = r["module"] as { id: string; name: string } | null;
    sources.push({
      ref: `step:${String(r["id"])}`,
      kind: "step",
      label: String(r["title"]),
      sublabel: mod ? `Step in ${mod.name}` : "Training step",
      text: `Step: ${r["title"]}\n${String(r["content_body"] ?? "")}`.slice(0, 2000),
      ...(mod ? { moduleId: mod.id } : {}),
      stepId: String(r["id"]),
    });
  }

  for (const row of moduleRes.data ?? []) {
    const r = row as Record<string, unknown>;
    sources.push({
      ref: `module:${String(r["id"])}`,
      kind: "module",
      label: String(r["name"]),
      sublabel: "Training module",
      text: `Module: ${r["name"]}\n${String(r["description"] ?? "")}`,
      moduleId: String(r["id"]),
    });
  }

  return sources.slice(0, 12);
}