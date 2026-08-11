import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  docSections,
  saveReferenceSections,
  sectionLineItems,
  submitReferenceSuggestion,
  type ReferenceDocumentRow,
  type ReferenceSection,
} from "@/lib/reference.queries";

/**
 * Manager+ line-item editor for one checklist section.
 * Owners write directly; managers route the same change through suggestion_queue.
 */
export function LineItemEditor({
  doc,
  sectionIndex,
}: {
  doc: ReferenceDocumentRow;
  sectionIndex: number;
}) {
  const { employee, isOwner, isGeneralManager } = useAuth();
  // GMs now write reference-document edits directly (own department, RLS-enforced).
  const canWriteDirect = isOwner || isGeneralManager;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  const sections = docSections(doc);
  const section = sections[sectionIndex];

  function start() {
    setItems(sectionLineItems(section ?? { title: "" }).map((i) => i.text));
    setWhy("");
    setOpen(true);
  }

  function move(index: number, delta: number) {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    setItems(next);
  }

  function nextSections(): ReferenceSection[] {
    return sections.map((s, i) =>
      i === sectionIndex
        ? {
            ...s,
            line_items: items
              .map((text) => text.trim())
              .filter(Boolean)
              .map((text, order) => ({ text, order })),
          }
        : s,
    );
  }

  async function save() {
    if (!employee) return;
    setBusy(true);
    try {
      if (canWriteDirect) {
        await saveReferenceSections({
          documentId: doc.id,
          sections: nextSections(),
          updatedBy: employee.id,
        });
        await queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
        toast.success("Section updated.");
      } else {
        const proposed = items
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text, i) => `${i + 1}. ${text}`)
          .join("\n");
        await submitReferenceSuggestion({
          documentId: doc.id,
          submittedBy: employee.id,
          what: `${doc.title} — “${section?.title ?? "Section"}” line items`,
          how: proposed || null,
          howYouKnow: why.trim() || null,
        });
        toast.success("Sent to the Owner approval queue.");
      }
      setOpen(false);
    } catch (error) {
      toast.error("Couldn't save that", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!section) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit line items"
            onClick={start}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{section.title || "Section"}</DialogTitle>
            <DialogDescription>
              {canWriteDirect
                ? "Direct edit — saves straight away and records version history."
                : "Manager edit — this goes to the Owner approval queue before it goes live."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items yet. Add the first one.</p>
            ) : null}
            {items.map((text, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  value={text}
                  onChange={(e) =>
                    setItems(items.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                />
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp className="size-4" />
                  <span className="sr-only">Move up</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                >
                  <ArrowDown className="size-4" />
                  <span className="sr-only">Move down</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4 text-destructive" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, ""])}>
              <Plus className="size-4" />
              Add line item
            </Button>
          </div>

          {!canWriteDirect ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">How do you know it should change?</p>
              <Textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                rows={3}
                placeholder="What you'd check before you'd sign off on it."
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || !employee}>
              {busy ? "Saving…" : canWriteDirect ? "Save section" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
