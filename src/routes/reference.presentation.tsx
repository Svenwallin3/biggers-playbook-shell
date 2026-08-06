import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Salad } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  createPresentationEntry,
  groupBy,
  presentationEntriesQueryOptions,
  updatePresentationEntry,
  type PresentationEntryRow,
} from "@/lib/reference.queries";

const title = "Portioning & Presentation Standards — Biggers Training Platform";
const description =
  "Portion sizes and plate-up standards for every item, grouped by category, at Biggers Market.";

export const Route = createFileRoute("/reference/presentation")({
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
  component: PresentationPage,
});

function EntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: PresentationEntryRow | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(entry?.category ?? "");
  const [itemName, setItemName] = useState(entry?.item_name ?? "");
  const [portionNote, setPortionNote] = useState(entry?.portion_note ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (entry) {
        await updatePresentationEntry({
          id: entry.id,
          category: category.trim(),
          itemName: itemName.trim(),
          portionNote: portionNote.trim() || null,
          updatedBy: employee?.id ?? null,
        });
      } else {
        await createPresentationEntry({
          category: category.trim(),
          itemName: itemName.trim(),
          portionNote: portionNote.trim() || null,
          department: employee?.department_scope ?? null,
          updatedBy: employee?.id ?? null,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["presentation-entries"] });
      toast.success(entry ? "Entry updated." : "Entry added.");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error("Couldn't save that", { description: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add an entry"}</DialogTitle>
          <DialogDescription>
            Managers edit these directly — no approval step, same as the Sourcing Board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Hot line, Deli case, Bakery…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item">Item</Label>
            <Input
              id="item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Chicken salad"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portion">Portion / presentation note</Label>
            <Textarea
              id="portion"
              rows={3}
              value={portionNote}
              onChange={(e) => setPortionNote(e.target.value)}
              placeholder="6 oz scoop, mounded, parsley on top."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!category.trim() || !itemName.trim()) {
                toast.error("Category and item name are both required.");
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PresentationPage() {
  const { isManagerOrOwner } = useAuth();
  const query = useQuery(presentationEntriesQueryOptions());
  const [editing, setEditing] = useState<PresentationEntryRow | null>(null);
  const [open, setOpen] = useState(false);

  const entries = query.data ?? [];
  const groups = groupBy(entries, (e) => e.category?.trim() || "Uncategorized");

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Portioning &amp; Presentation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What a correct portion looks like, item by item.
          </p>
        </div>
        {isManagerOrOwner ? <Button onClick={openNew}>Add entry</Button> : null}
      </div>

      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load these standards.</p>
      ) : entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-12 text-center">
            <Salad className="mx-auto size-8 text-muted-foreground" />
            <p className="font-display text-sm font-semibold">No standards yet</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {isManagerOrOwner
                ? "Add the first item — a category, the item name, and what a correct portion looks like."
                : "Nothing has been added here yet. Ask your manager to add the first item."}
            </p>
            {isManagerOrOwner ? (
              <Button variant="outline" onClick={openNew}>
                Add the first entry
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([category, rows]) => (
            <section key={category} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              <div className="space-y-2">
                {rows.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{entry.item_name}</p>
                        {entry.portion_note ? (
                          <p className="text-sm text-muted-foreground">{entry.portion_note}</p>
                        ) : null}
                      </div>
                      {isManagerOrOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(entry);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EntryDialog
        key={editing?.id ?? "new"}
        entry={editing}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
