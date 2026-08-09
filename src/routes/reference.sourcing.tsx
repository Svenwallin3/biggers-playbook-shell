import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sourcingQueryOptions, type SourcingRow } from "@/lib/training.queries";
import { PhotoUpload, StoredPhoto } from "@/components/PhotoUpload";
import { ReportDeliveryIssueDialog } from "@/components/sourcing/ReportDeliveryIssueDialog";

const title = "Sourcing Board — Biggers Training Platform";
const description = "Where Biggers Market ingredients and products come from.";

export const Route = createFileRoute("/reference/sourcing")({
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

const CATEGORIES = [
  { value: "fruit", label: "Fruit", dot: "bg-accent" },
  { value: "vegetable", label: "Vegetable", dot: "bg-success" },
  { value: "dairy", label: "Dairy", dot: "bg-info" },
  { value: "meat", label: "Meat & seafood", dot: "bg-destructive" },
  { value: "bakery", label: "Bakery", dot: "bg-warning" },
  { value: "pantry", label: "Pantry", dot: "bg-primary" },
  { value: "beverage", label: "Beverage", dot: "bg-surface-foreground" },
  { value: "other", label: "Other", dot: "bg-muted-foreground" },
] as const;

function categoryMeta(value: string | null) {
  return CATEGORIES.find((c) => c.value === value) ?? null;
}

/** Fixed-footprint 44px row thumbnail; falls back to a muted placeholder. */
function RowThumb({ path, alt }: { path: string | null; alt: string }) {
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-muted">
      <span className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
      </span>
      {path ? (
        <StoredPhoto path={path} alt={alt} className="relative size-full rounded-none border-0" />
      ) : null}
    </div>
  );
}

function CategoryDot({ value }: { value: string | null }) {
  const meta = categoryMeta(value);
  return (
    <span
      title={meta?.label ?? "Uncategorized"}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        meta ? meta.dot : "bg-border",
      )}
    />
  );
}

type FormState = {
  product: string;
  supplier: string;
  region: string;
  seasonality: string;
  category: string;
  notes: string;
  photoUrl: string | null;
};

const blank: FormState = {
  product: "",
  supplier: "",
  region: "",
  seasonality: "",
  category: "",
  notes: "",
  photoUrl: null,
};

function toForm(entry: SourcingRow): FormState {
  return {
    product: entry.product,
    supplier: entry.supplier ?? "",
    region: entry.region ?? "",
    seasonality: entry.seasonality ?? "",
    category: entry.category ?? "",
    notes: entry.notes ?? "",
    photoUrl: entry.photo_url ?? null,
  };
}

function SourcingBoardPage() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const entriesQuery = useQuery(sourcingQueryOptions());
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

  const canEdit = employee?.auth_tier === "manager" || employee?.auth_tier === "owner";

  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, "new" = create
  const [form, setForm] = useState<FormState>(blank);
  const [viewing, setViewing] = useState<SourcingRow | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.product.toLowerCase().includes(q));
  }, [entries, query]);

  function openNew() {
    setForm(blank);
    setEditingId("new");
  }

  function openEntry(entry: SourcingRow) {
    setForm(toForm(entry));
    setEditingId(entry.id);
    setPickerOpen(false);
    setQuery("");
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        product: form.product.trim(),
        supplier: form.supplier.trim() || null,
        region: form.region.trim() || null,
        seasonality: form.seasonality.trim() || null,
        category: form.category || null,
        notes: form.notes.trim() || null,
        photo_url: form.photoUrl,
      };
      if (editingId === "new") {
        const { error } = await supabase.from("sourcing_board_entries").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sourcing_board_entries")
          .update(payload)
          .eq("id", editingId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId === "new" ? `Added “${form.product}”.` : `Updated “${form.product}”.`);
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["sourcing-board"] });
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.product.trim()) {
      toast.error("Product name is required.");
      return;
    }
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Sourcing Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who we buy from, so you can answer a guest without guessing.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setReportOpen(true)}
          >
            <AlertTriangle className="mr-1.5 size-4" />
            Report a delivery issue
          </Button>
          {canEdit ? (
            <>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Find a product"
                className="pl-8"
                placeholder="Find a product…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPickerOpen(true);
                }}
                onFocus={() => setPickerOpen(true)}
                onBlur={() => {
                  blurTimer.current = setTimeout(() => setPickerOpen(false), 120);
                }}
              />
              {pickerOpen ? (
                <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {matches.length ? (
                    matches.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={() => {
                            if (blurTimer.current) clearTimeout(blurTimer.current);
                          }}
                          onClick={() => openEntry(entry)}
                        >
                          <CategoryDot value={entry.category} />
                          <span className="flex-1 truncate">{entry.product}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-2 py-1.5 text-sm text-muted-foreground">No product found.</li>
                  )}
                </ul>
              ) : null}
            </div>
            <Button className="w-full sm:w-auto" onClick={openNew}>
              <Plus className="mr-1.5 size-4" />
              Add product
            </Button>
            </>
          ) : null}
        </div>
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
            <ul className="divide-y">
              {entries.map((entry) => {
                const meta = categoryMeta(entry.category);
                const row = (
                  <div className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-left">
                    <span className="flex items-center gap-2 font-medium">
                      <CategoryDot value={entry.category} />
                      {entry.product}
                    </span>
                    {meta ? (
                      <span className="text-xs text-muted-foreground">{meta.label}</span>
                    ) : null}
                    <span className="text-sm text-muted-foreground">
                      {entry.region || entry.supplier ? (
                        <>
                          {entry.region}
                          {entry.region && entry.supplier ? " · " : ""}
                          {entry.supplier}
                        </>
                      ) : (
                        <span className="italic">Origin not confirmed yet</span>
                      )}
                    </span>
                    {entry.seasonality ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        In season {entry.seasonality}
                      </span>
                    ) : null}
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      Last updated{" "}
                      {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                    </span>
                    {entry.notes ? (
                      <p className="w-full text-xs text-muted-foreground">{entry.notes}</p>
                    ) : null}
                  </div>
                );
                return (
                  <li key={entry.id}>
                    <div className="flex items-center transition-colors hover:bg-muted/60">
                      <button
                        type="button"
                        onClick={() => setViewing(entry)}
                        className="flex min-w-0 flex-1 items-center gap-3 pr-3"
                      >
                        <span className="min-w-0 flex-1">{row}</span>
                        <RowThumb path={entry.photo_url ?? null} alt={entry.product} />
                      </button>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${entry.product}`}
                          className="mr-3 shrink-0"
                          onClick={() => openEntry(entry)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProductDetailDialog entry={viewing} onClose={() => setViewing(null)} />

      <ReportDeliveryIssueDialog open={reportOpen} onOpenChange={setReportOpen} />

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId === "new" ? "Add a product" : `Edit ${form.product || "product"}`}
              </DialogTitle>
              <DialogDescription>
                Only the product name is required — leave origin blank if it isn&apos;t confirmed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2.5 rounded-full", c.dot)} />
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Origin / region (optional)</Label>
                  <Input
                    id="region"
                    maxLength={80}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="Rutherford County, NC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Farm / supplier (optional)</Label>
                  <Input
                    id="supplier"
                    maxLength={80}
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Sunset Ridge Produce"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seasonality">Typical season (optional)</Label>
                <Input
                  id="seasonality"
                  maxLength={60}
                  value={form.seasonality}
                  onChange={(e) => setForm({ ...form, seasonality: e.target.value })}
                  placeholder="April–August"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  maxLength={280}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Delivery day, anything staff should know."
                />
              </div>

              <PhotoUpload
                folder="sourcing"
                value={form.photoUrl}
                onChange={(photoUrl) => setForm((prev) => ({ ...prev, photoUrl }))}
                label="Product photo (optional)"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {editingId === "new" ? "Add product" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function ProductDetailDialog({
  entry,
  onClose,
}: {
  entry: SourcingRow | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {entry ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CategoryDot value={entry.category} />
                {entry.product}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {entry.photo_url ? (
                <StoredPhoto
                  path={entry.photo_url}
                  alt={entry.product}
                  className="max-h-56"
                />
              ) : null}

              <DetailBlock label="Where it's from">
                {entry.region || <span className="italic text-muted-foreground">Not confirmed yet</span>}
              </DetailBlock>

              <DetailBlock label="Farm or vendor name">
                {entry.supplier || <span className="italic text-muted-foreground">Not confirmed yet</span>}
              </DetailBlock>

              <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tasting Notes &amp; Seasonality
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Tasting Notes</p>
                  <p className="text-sm">
                    {entry.notes || (
                      <span className="italic text-muted-foreground">Nothing noted yet</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Seasonality</p>
                  <p className="text-sm">
                    {entry.seasonality || (
                      <span className="italic text-muted-foreground">Not noted yet</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Indicates whether this is local or sourced from elsewhere (like Georgia or
                    Florida), not whether we currently carry it.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
