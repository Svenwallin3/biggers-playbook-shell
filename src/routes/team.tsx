import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { employeesQueryOptions, type EmployeeRow } from "@/lib/admin.queries";
import type { Database } from "@/integrations/supabase/types";

type AuthTier = Database["public"]["Enums"]["auth_tier"];
type Department = Database["public"]["Enums"]["department"];

const tiers: AuthTier[] = ["staff", "manager", "owner"];
const departments: Department[] = ["universal", "market", "kitchen", "delivery"];
const NONE = "__none__";

/** Market runs two sites; Kitchen and Delivery are single-site, so they stay null. */
const locations: { value: string; label: string }[] = [
  { value: "market_street", label: "Market Street" },
  { value: "carolina_beach_road", label: "Carolina Beach Road" },
];

const title = "Team — Biggers Training Platform";
const description = "Owner tool for setting each employee's access tier and department.";

export const Route = createFileRoute("/team")({
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
  component: TeamPage,
});

function TeamPage() {
  const { isOwner, loading, session } = useAuth();
  const queryClient = useQueryClient();
  const employeesQuery = useQuery(employeesQueryOptions());

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<EmployeeRow> }) => {
      const { error } = await supabase.from("employees").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Team management is owner-only.</p>;
  }

  const rows = (employeesQuery.data ?? []).filter((e) => !e.is_deleted);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set each person&apos;s access tier and department. Managers edit content for the
          department set here.
        </p>
      </div>

      {employeesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading employees…</p>
      ) : null}
      {employeesQuery.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load employees.</p>
      ) : null}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[150px]">Access tier</TableHead>
              <TableHead className="w-[170px]">Department</TableHead>
              <TableHead className="w-[150px]">Path</TableHead>
              <TableHead className="w-[190px]">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{e.email}</TableCell>
                <TableCell>
                  <Select
                    value={e.auth_tier}
                    disabled={update.isPending}
                    onValueChange={(v) =>
                      update.mutate({ id: e.id, patch: { auth_tier: v as AuthTier } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={e.department_scope ?? NONE}
                    disabled={update.isPending}
                    onValueChange={(v) =>
                      update.mutate({
                        id: e.id,
                        patch: { department_scope: v === NONE ? null : (v as Department) },
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={e.path ?? NONE}
                    disabled={update.isPending}
                    onValueChange={(v) =>
                      update.mutate({ id: e.id, patch: { path: v === NONE ? null : v } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      <SelectItem value="market">market</SelectItem>
                      <SelectItem value="kitchen">kitchen</SelectItem>
                      <SelectItem value="delivery">delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={e.location_id ?? NONE}
                    disabled={update.isPending}
                    onValueChange={(v) =>
                      update.mutate({ id: e.id, patch: { location_id: v === NONE ? null : v } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
