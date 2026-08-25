import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { divisionLabel } from "@/lib/reference.queries";
import type { Database } from "@/integrations/supabase/types";

type Department = Database["public"]["Enums"]["department"];

/** Universal isn't a division employees belong to, so it's intentionally absent. */
const divisions: Department[] = ["market", "kitchen", "delivery"];

type StructureRow = {
  id: string;
  name: string;
  is_active: boolean;
  sequence_order: number;
};

const title = "Locations & Paths — Biggers Training Platform";
const description =
  "Owner-only admin for the sites and training paths each Biggers Market division uses.";

export const Route = createFileRoute("/admin/locations-paths")({
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
  component: LocationsPathsPage,
});

function structureQueryOptions(division: Department) {
  return queryOptions({
    queryKey: ["admin-structure", division],
    queryFn: async () => {
      const [locationRes, trackRes] = await Promise.all([
        supabase
          .from("locations")
          .select("id, name, is_active, sequence_order")
          .eq("division", division)
          .eq("is_deleted", false)
          .order("sequence_order"),
        supabase
          .from("tracks")
          .select("id")
          .eq("department", division)
          .eq("is_deleted", false)
          .order("sequence_order"),
      ]);
      if (locationRes.error) throw locationRes.error;
      if (trackRes.error) throw trackRes.error;

      const trackId = trackRes.data?.[0]?.id ?? null;
      let paths: StructureRow[] = [];
      if (trackId) {
        const { data, error } = await supabase
          .from("paths")
          .select("id, name, is_active, sequence_order")
          .eq("track_id", trackId)
          .eq("is_deleted", false)
          .order("sequence_order");
        if (error) throw error;
        paths = (data ?? []) as StructureRow[];
      }

      return {
        trackId,
        locations: (locationRes.data ?? []) as StructureRow[],
        paths,
      };
    },
  });
}

function LocationsPathsPage() {
  const { isOwner, loading, session } = useAuth();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session) return <Navigate to="/login" />;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Locations &amp; Paths is owner-only.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Locations &amp; Paths</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add sites and training paths per division. Nothing is ever deleted — switching a row to
          inactive just keeps it out of future pickers without touching anyone already assigned.
        </p>
      </div>

      {divisions.map((division) => (
        <DivisionSection key={division} division={division} />
      ))}
    </div>
  );
}

function DivisionSection({ division }: { division: Department }) {
  const query = useQuery(structureQueryOptions(division));
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{divisionLabel(division)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <StructureList
          heading="Locations"
          division={division}
          table="locations"
          rows={data?.locations ?? []}
          loading={query.isPending}
          parentId={division}
        />
        <StructureList
          heading="Paths"
          division={division}
          table="paths"
          rows={data?.paths ?? []}
          loading={query.isPending}
          parentId={data?.trackId ?? null}
          missingParentMessage="This division has no track yet, so it can't hold paths."
        />
      </CardContent>
    </Card>
  );
}

function StructureList({
  heading,
  division,
  table,
  rows,
  loading,
  parentId,
  missingParentMessage,
}: {
  heading: string;
  division: Department;
  table: "locations" | "paths";
  rows: StructureRow[];
  loading: boolean;
  parentId: string | null;
  missingParentMessage?: string;
}) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-structure", division] });
    void queryClient.invalidateQueries({ queryKey: ["location-options"] });
    void queryClient.invalidateQueries({ queryKey: ["branch-options"] });
  };

  const duplicate = (name: string, ignoreId?: string) =>
    rows.some(
      (r) =>
        r.is_active &&
        r.id !== ignoreId &&
        r.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const create = useMutation({
    mutationFn: async (name: string) => {
      const nextOrder = rows.reduce((max, r) => Math.max(max, r.sequence_order), 0) + 1;
      const payload =
        table === "locations"
          ? { division, name, sequence_order: nextOrder }
          : { track_id: parentId!, name, sequence_order: nextOrder };
      const { error: insertError } = await supabase.from(table).insert(payload as never);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setNewName("");
      setError(null);
      toast.success("Added");
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<StructureRow> }) => {
      const { error: updateError } = await supabase
        .from(table)
        .update(input.patch as never)
        .eq("id", input.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  const swap = (index: number, direction: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!a || !b) return;
    update.mutate({ id: a.id, patch: { sequence_order: b.sequence_order } });
    update.mutate({ id: b.id, patch: { sequence_order: a.sequence_order } });
  };

  const submitNew = () => {
    const name = newName.trim();
    if (!name) {
      setError("Enter a name first.");
      return;
    }
    if (duplicate(name)) {
      setError(`“${name}” already exists here.`);
      return;
    }
    create.mutate(name);
  };

  const submitRename = (row: StructureRow) => {
    const name = editName.trim();
    if (!name) return;
    if (name === row.name) {
      setEditingId(null);
      return;
    }
    if (duplicate(name, row.id)) {
      toast.error(`“${name}” already exists here.`);
      return;
    }
    update.mutate({ id: row.id, patch: { name } });
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !parentId ? (
        <p className="text-sm text-muted-foreground">{missingParentMessage}</p>
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {rows.map((row, index) => (
                <li key={row.id} className="flex items-center gap-2 px-3 py-2">
                  {editingId === row.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Save name"
                        onClick={() => submitRename(row)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Cancel rename"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          row.is_active ? "" : "text-muted-foreground line-through"
                        }`}
                      >
                        {row.name}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Rename ${row.name}`}
                        onClick={() => {
                          setEditingId(row.id);
                          setEditName(row.name);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${row.name} up`}
                        disabled={index === 0 || update.isPending}
                        onClick={() => swap(index, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${row.name} down`}
                        disabled={index === rows.length - 1 || update.isPending}
                        onClick={() => swap(index, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Switch
                        checked={row.is_active}
                        aria-label={`${row.name} active`}
                        disabled={update.isPending}
                        onCheckedChange={(checked) =>
                          update.mutate({ id: row.id, patch: { is_active: checked } })
                        }
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={newName}
              placeholder={table === "locations" ? "New location name" : "New path name"}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
              }}
              className="h-8"
            />
            <Button size="sm" onClick={submitNew} disabled={create.isPending}>
              Add
            </Button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      )}
    </section>
  );
}
