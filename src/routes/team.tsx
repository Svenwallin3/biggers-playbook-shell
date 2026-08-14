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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { employeesQueryOptions, type EmployeeRow } from "@/lib/admin.queries";
import { onboardingCompletionQueryOptions } from "@/lib/queue.queries";
import { divisionLabel } from "@/lib/reference.queries";
import { branchOptionsQueryOptions } from "@/lib/training.queries";
import type { Database } from "@/integrations/supabase/types";

type AuthTier = Database["public"]["Enums"]["auth_tier"];
type Department = Database["public"]["Enums"]["department"];
type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

const tiers: AuthTier[] = ["staff", "manager", "owner"];
const gmTiers: AuthTier[] = ["staff", "manager"];
const statuses: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const departments: Department[] = ["universal", "market", "kitchen", "delivery"];
const NONE = "__none__";

/** Owner-only branch (sub_path) control; "n/a" when the division has no branch split. */
function BranchCell({
  employee: e,
  disabled,
  onChange,
}: {
  employee: EmployeeRow;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const branchQuery = useQuery(branchOptionsQueryOptions(e.department_scope));
  const options = branchQuery.data ?? [];
  if (branchQuery.isPending) {
    return <span className="text-sm text-muted-foreground">…</span>;
  }
  if (options.length < 2) {
    return <span className="text-xs text-muted-foreground">n/a</span>;
  }
  return (
    <Select
      value={e.sub_path ?? NONE}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Market runs two sites; Kitchen and Delivery are single-site, so they stay null. */
const locations: { value: string; label: string }[] = [
  { value: "market_street", label: "Market Street" },
  { value: "carolina_beach_road", label: "Carolina Beach Road" },
];

const title = "Team — Biggers Training Platform";
const description = "Owner tool for setting each employee's access tier and division.";

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
  const { isOwner, isGeneralManager, employee, loading, session } = useAuth();
  const queryClient = useQueryClient();
  const employeesQuery = useQuery(employeesQueryOptions());
  const onboardingQuery = useQuery(onboardingCompletionQueryOptions());

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
  if (!isOwner && !isGeneralManager) {
    return <p className="text-sm text-muted-foreground">Team management is owner-only.</p>;
  }

  const all = (employeesQuery.data ?? []).filter((e) => !e.is_deleted);
  const rows = isOwner
    ? all
    : all.filter(
        (e) =>
          e.auth_tier !== "owner" &&
          e.department_scope === (employee?.department_scope ?? null) &&
          e.location_id === (employee?.location_id ?? null),
      );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Team</h1>
        {isOwner ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Set each person&apos;s access tier and division. Managers edit content for the
            division set here. General Managers can promote and demote staff in their own
            division and location.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            As a General Manager you can promote staff to manager, or move a manager back to
            staff, for your own division and location.
          </p>
        )}
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
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[130px]">Onboarding</TableHead>
              {isOwner ? (
                <>
                  <TableHead className="w-[150px]">General Manager</TableHead>
                  <TableHead className="w-[170px]">Division</TableHead>
                  <TableHead className="w-[150px]">Path</TableHead>
                  <TableHead className="w-[150px]">Branch</TableHead>
                  <TableHead className="w-[190px]">Location</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-[170px]">Division</TableHead>
                  <TableHead className="w-[190px]">Location</TableHead>
                </>
              )}
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
                    disabled={update.isPending || (!isOwner && e.auth_tier === "owner")}
                    onValueChange={(v) =>
                      update.mutate({ id: e.id, patch: { auth_tier: v as AuthTier } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isOwner ? tiers : gmTiers).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={e.status}
                    disabled={update.isPending || e.status === "merged"}
                    onValueChange={(v) =>
                      update.mutate({ id: e.id, patch: { status: v as EmployeeStatus } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {e.status === "merged" ? (
                        <SelectItem value="merged">Merged</SelectItem>
                      ) : null}
                      {statuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {(() => {
                    const p = onboardingQuery.data?.[e.id];
                    if (!e.path || !p || p.total === 0) {
                      return <span className="text-sm text-muted-foreground">—</span>;
                    }
                    return p.completed >= p.total ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <Badge variant="outline">
                        {p.completed}/{p.total}
                      </Badge>
                    );
                  })()}
                </TableCell>
                {isOwner ? (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={e.can_manage_team}
                        disabled={update.isPending || e.auth_tier !== "manager"}
                        aria-label="General Manager"
                        onCheckedChange={(checked) =>
                          update.mutate({ id: e.id, patch: { can_manage_team: checked } })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {e.auth_tier === "manager" ? (e.can_manage_team ? "GM" : "—") : "n/a"}
                      </span>
                    </div>
                  </TableCell>
                ) : null}
                <TableCell>
                  {!isOwner ? (
                    <span className="text-sm text-muted-foreground">
                      {e.department_scope ? divisionLabel(e.department_scope) : "—"}
                    </span>
                  ) : (
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
                          {divisionLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </TableCell>
                {isOwner ? (
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
                ) : null}
                {isOwner ? (
                  <TableCell>
                    <BranchCell
                      employee={e}
                      disabled={update.isPending}
                      onChange={(sub_path) => update.mutate({ id: e.id, patch: { sub_path } })}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  {!isOwner ? (
                    <span className="text-sm text-muted-foreground">
                      {locations.find((l) => l.value === e.location_id)?.label ?? "—"}
                    </span>
                  ) : (
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
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
