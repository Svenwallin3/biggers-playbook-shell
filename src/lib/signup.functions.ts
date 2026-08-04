import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z ]/g, "").trim();
}

// Simple Levenshtein distance for lightweight fuzzy name matching.
function distance(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

export const findPossibleDuplicate = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ fullName: z.string().min(2).max(120), email: z.string().email() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("employees")
      .select("id, full_name, email")
      .eq("is_deleted", false);
    if (error) throw error;

    const target = normalize(data.fullName);
    const email = data.email.toLowerCase();

    for (const row of rows ?? []) {
      if (!row.full_name) continue;
      if (row.email?.toLowerCase() === email) return { match: null };
      const candidate = normalize(row.full_name);
      const threshold = Math.max(1, Math.floor(candidate.length * 0.25));
      if (distance(candidate, target) <= threshold) {
        return { match: { fullName: row.full_name, maskedEmail: maskEmail(row.email ?? "") } };
      }
    }
    return { match: null };
  });
