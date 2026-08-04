import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sourcingQueryOptions } from "@/lib/training.queries";

const title = "Sourcing Board — Biggers Training Platform";
const description = "Where Biggers Market ingredients and products come from.";

export const Route = createFileRoute("/sourcing-board")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SourcingBoardPage,
});

const blank = { product: "", supplier: "", region: "", since_date: "", notes: "" };

function SourcingBoardPage() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const entriesQuery = useQuery(sourcingQueryOptions());
  const entries = entriesQuery.data ?? [];

  const canEdit = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";
  const [editingId, setEditingId] = useState<string>("new");
  const [form, setForm] = useState(blank);

  function selectEntry(id: string) {
    setEditingId(id);
    if (id === "new") {
      setForm(blank);
      return;
    }
    const e = entries.find((x) => x.id === id);
    if (e) {
      setForm({
        product: e.product,
        supplier: e.supplier ?? "",
        region: e.region ?? "",
        since_date: e.since_date ?? "",
        notes: e.notes ?? "",
      });
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        product: form.product.trim(),
        supplier: form.supplier.trim() || null,
        region: form.region.trim() || null,
        since_date: form.since_date || null,
        notes: form.notes.trim() || null,
      };
      if (editingId === "new") {
        const { error } = await supabase.from("sourcing_board_entries").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sourcing_board_entries")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId === "new" ? `Added “${form.product}”.` : `Updated “${form.product}”.`);
      if (editingId === "new") setForm(blank);
      void queryClient.invalidateQueries({ queryKey: ["sourcing-board"] });
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.product.trim() || !form.supplier.trim()) {
      toast.error("Product and supplier are both required.");
      return;
    }
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sourcing Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who we buy from, so you can answer a guest without guessing.
        </p>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {entriesQuery.isPending ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">Loading entries…</p>
          ) : entriesQuery.isError ? (
            <p className="px-6 py-6 text-sm text-destructive">Couldn&apos;t load the board.</p>
          ) : !entries.length ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Origin / region</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.product}</TableCell>
                    <TableCell>{entry.region}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.supplier}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.since_date}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {entry.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add or update an entry</CardTitle>
            <CardDescription>
              Managers only. Changes here route through Owner approval before trainees see them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Entry</Label>
                <Select value={editingId} onValueChange={selectEntry}>
                  <SelectTrigger className="sm:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ New entry</SelectItem>
                    {entries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Input
                    id="product"
                    maxLength={80}
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    placeholder="Heirloom tomatoes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Origin / region</Label>
                  <Input
                    id="region"
                    maxLength={80}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="Rutherford County, NC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    maxLength={80}
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Sunset Ridge Produce"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="since">Since</Label>
                  <Input
                    id="since"
                    type="date"
                    value={form.since_date}
                    onChange={(e) => setForm({ ...form, since_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  maxLength={280}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Season, delivery day, anything staff should know."
                />
              </div>

              <Button type="submit" disabled={save.isPending}>
                {editingId === "new" ? "Add entry" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
