import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { employeesQueryOptions, type EmployeeRow } from "@/lib/admin.queries";
import {
  addSecondaryDivision,
  employeeSecondaryDivisionsQueryOptions,
  endSecondaryDivision,
} from "@/lib/cross-training.queries";
import { onboardingCompletionQueryOptions } from "@/lib/queue.queries";
import { divisionLabel } from "@/lib/reference.queries";
import { allLocationsQueryOptions, branchOptionsQueryOptions } from "@/lib/training.queries";
import type { Database } from "@/integrations/supabase/types";

type AuthTier = Database["public"]["Enums"]["auth_tier"];
type Department = Database["public"]["Enums"]["department"];
type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

const ownerTierOptions = ["staff", "manager", "general_manager", "owner"] as const;
const gmTiers: AuthTier[] = ["staff", "manager"];
const statuses: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const departments: Department[] = ["universal", "market", "kitchen", "delivery"];
const NONE = "__none__";

/** Owner-only branch (path) control; "n/a" when the division has no branch split. */
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
      value={e.path_id ?? NONE}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * GM/Owner control for cross-training: shows active secondary divisions with an
 * "End" action, plus a division (+ branch) picker to add another one. Regular
 * managers never see this — the RLS on `employee_secondary_divisions` matches.
 */
function CrossTrainingCell({ employee: e }: { employee: EmployeeRow }) {
  const { employee: me } = useAuth();
  const queryClient = useQueryClient();
  const rowsQuery = useQuery(employeeSecondaryDivisionsQueryOptions(e.id));
  const [department, setDepartment] = useState<Department | "">("");
  const [path, setPath] = useState<string>(NONE);
  const branchQuery = useQuery(branchOptionsQueryOptions(department || null));
  const branchOptions = department ? (branchQuery.data ?? []) : [];
  // Existing rows can point at a branch in a division other than the one being added.
  const homeBranchQuery = useQuery(branchOptionsQueryOptions(e.department_scope));
  const branchNameById = new Map(
    [...(branchQuery.data ?? []), ...(homeBranchQuery.data ?? [])].map((p) => [p.id, p.name]),
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["secondary-divisions"] });
    void queryClient.invalidateQueries({ queryKey: ["training-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["onboarding-completion"] });
  };

  const add = useMutation({
    mutationFn: () =>
      addSecondaryDivision({
        employeeId: e.id,
        department: department as Department,
        pathId: path === NONE ? null : path,
        assignedBy: me?.id ?? null,
      }),
    onSuccess: () => {
      toast.success("Cross-training added");
      setDepartment("");
      setPath(NONE);
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Couldn't add cross-training", { description: error.message }),
  });

  const end = useMutation({
    mutationFn: (id: string) => endSecondaryDivision({ id, endedBy: me?.id ?? null }),
    onSuccess: () => {
      toast.success("Cross-training ended");
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Couldn't end cross-training", { description: error.message }),
  });

  const taken = new Set((rowsQuery.data ?? []).map((r) => r.department));
  const options = departments.filter(
    (d) => d !== "universal" && d !== e.department_scope && !taken.has(d),
  );

  return (
    <div className="space-y-2">
      {(rowsQuery.data ?? []).map((row) => (
        <div key={row.id} className="flex items-center gap-1">
          <Badge variant="secondary">
            {divisionLabel(row.department)}
            {row.path_id ? ` · ${branchNameById.get(row.path_id) ?? "branch"}` : ""}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={end.isPending}
            onClick={() => end.mutate(row.id)}
          >
            End
          </Button>
        </div>
      ))}
      {options.length ? (
        <div className="flex flex-wrap items-center gap-1">
          <Select
            value={department}
            onValueChange={(v) => {
              setDepartment(v as Department);
              setPath(NONE);
            }}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Cross-train…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((d) => (
                <SelectItem key={d} value={d}>
                  {divisionLabel(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {branchOptions.length > 1 ? (
            <Select value={path} onValueChange={setPath}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No branch</SelectItem>
                {branchOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            size="sm"
            className="h-8"
            disabled={!department || add.isPending}
            onClick={() => add.mutate()}
          >
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}




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

type SortKey =
  | "name"
  | "email"
  | "tier"
  | "status"
  | "onboarding"
  | "division"
  | "path"
  | "location";

function TeamPage() {
  const { isOwner, isGeneralManager, employee, loading, session } = useAuth();
  const queryClient = useQueryClient();
  const employeesQuery = useQuery(employeesQueryOptions());
  const onboardingQuery = useQuery(onboardingCompletionQueryOptions());

  const locations = useQuery(allLocationsQueryOptions()).data ?? [];
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const pathsQuery = useQuery({
    queryKey: ["team-path-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("paths").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const pathNames = new Map((pathsQuery.data ?? []).map((p) => [p.id, p.name]));
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
  const scoped = isOwner
    ? all
    : all.filter(
        (e) =>
          e.auth_tier !== "owner" &&
          e.department_scope === (employee?.department_scope ?? null) &&
          e.location_id === (employee?.location_id ?? null),
      );
  const tierRank = (e: EmployeeRow) =>
    e.auth_tier === "owner" ? 0 : e.auth_tier === "manager" ? (e.can_manage_team ? 1 : 2) : 3;
  const sortValue = (e: EmployeeRow, key: SortKey): string | number | null => {
    switch (key) {
      case "name":
        return e.full_name?.toLowerCase() ?? null;
      case "email":
        return e.email?.toLowerCase() ?? null;
      case "tier":
        return tierRank(e);
      case "status":
        return e.status ?? null;
      case "onboarding": {
        const p = onboardingQuery.data?.[e.id];
        return p && p.total ? p.completed / p.total : null;
      }
      case "division":
        return e.department_scope ? divisionLabel(e.department_scope).toLowerCase() : null;
      case "path":
        return e.path_id ? (pathNames.get(e.path_id)?.toLowerCase() ?? null) : null;
      case "location":
        return e.location_id
          ? (locations.find((l) => l.id === e.location_id)?.name.toLowerCase() ?? null)
          : null;
    }
  };
  const rows = [...scoped].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === vb) return 0;
    if (va === null) return 1; // blanks always last
    if (vb === null) return -1;
    const cmp = va < vb ? -1 : 1;
    return sort.dir === "asc" ? cmp : -cmp;
  });
  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() =>
          setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))
        }
      >
        {label}
        {sort.key === k ? (
          sort.dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
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
              <SortHead k="name" label="Name" />
              <SortHead k="email" label="Email" />
              <SortHead k="tier" label="Access tier" className="w-[150px]" />
              <SortHead k="status" label="Status" className="w-[140px]" />
              <SortHead k="onboarding" label="Onboarding" className="w-[130px]" />
              <TableHead className="w-[210px]">Cross-training</TableHead>
              <SortHead k="division" label="Division" className="w-[170px]" />
              {isOwner ? <SortHead k="path" label="Path" className="w-[150px]" /> : null}
              <SortHead k="location" label="Location" className="w-[190px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{e.email}</TableCell>
                <TableCell>
                  <Select
                    value={
                      e.auth_tier === "manager" && e.can_manage_team
                        ? "general_manager"
                        : e.auth_tier
                    }
                    disabled={update.isPending || (!isOwner && e.auth_tier === "owner")}
                    onValueChange={(v) =>
                      update.mutate({
                        id: e.id,
                        patch:
                          v === "general_manager"
                            ? { auth_tier: "manager", can_manage_team: true }
                            : { auth_tier: v as AuthTier, can_manage_team: false },
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isOwner ? ownerTierOptions : gmTiers).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "general_manager" ? "general manager" : t}
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
                    if (!e.department_scope || !p || p.total === 0) {
                      return <span className="text-sm text-muted-foreground">—</span>;
                    }
                    return p.completed >= p.total ? (
                      <Badge variant="secondary">Complete</Badge>
                    ) : (
                      <Badge variant="outline">
                        {p.completed}/{p.total} steps
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <CrossTrainingCell employee={e} />
                </TableCell>
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
                    <BranchCell
                      employee={e}
                      disabled={update.isPending}
                      onChange={(path_id) => update.mutate({ id: e.id, patch: { path_id } })}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  {!isOwner ? (
                    <span className="text-sm text-muted-foreground">
                      {locations.find((l) => l.id === e.location_id)?.name ?? "—"}
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
                      {locations
                        .filter((l) => e.department_scope && l.division === e.department_scope)
                        .map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
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
