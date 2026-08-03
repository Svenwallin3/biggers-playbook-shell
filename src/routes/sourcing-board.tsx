import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { sourcingBoard, type SourcingEntry } from "@/data/mockTraining";

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

function SourcingBoardPage() {
  const [entries, setEntries] = useState<SourcingEntry[]>(sourcingBoard);
  const [editingId, setEditingId] = useState<string>("new");
  const blank = { item: "", supplier: "", region: "", since: "", note: "" };
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
        item: e.item,
        supplier: e.supplier,
        region: e.region,
        since: e.since,
        note: e.note,
      });
    }
  }

  function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.item.trim() || !form.supplier.trim()) {
      toast.error("Product and supplier are both required.");
      return;
    }
    if (editingId === "new") {
      setEntries((prev) => [...prev, { id: `src_${Date.now()}`, ...form }]);
      toast.success(`Added “${form.item}” to the board.`);
      setForm(blank);
    } else {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...form } : e)));
      toast.success(`Updated “${form.item}”.`);
    }
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
                  <TableCell className="font-medium">{entry.item}</TableCell>
                  <TableCell>{entry.region}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.supplier}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.since}</TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    {entry.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add or update an entry</CardTitle>
          <CardDescription>
            Managers only. Changes here route through Owner approval before trainees see them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
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
                      {e.item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item">Product</Label>
                <Input
                  id="item"
                  maxLength={80}
                  value={form.item}
                  onChange={(e) => setForm({ ...form, item: e.target.value })}
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
                  maxLength={20}
                  value={form.since}
                  onChange={(e) => setForm({ ...form, since: e.target.value })}
                  placeholder="Jul 2021"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                rows={2}
                maxLength={280}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Season, delivery day, anything staff should know."
              />
            </div>

            <Button type="submit">{editingId === "new" ? "Add entry" : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}