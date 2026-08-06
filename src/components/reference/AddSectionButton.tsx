import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  docSections,
  saveReferenceSections,
  submitReferenceSuggestion,
  type ReferenceDocumentRow,
} from "@/lib/reference.queries";

/** Append a new, empty section to a checklist or SOP. Owner direct, manager suggests. */
export function AddSectionButton({ doc }: { doc: ReferenceDocumentRow }) {
  const { employee, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!employee) return;
    if (!title.trim()) {
      toast.error("A section title is required.");
      return;
    }
    setBusy(true);
    try {
      if (isOwner) {
        const sections = docSections(doc);
        await saveReferenceSections({
          documentId: doc.id,
          sections: [
            ...sections,
            doc.document_type === "checklist"
              ? { title: title.trim(), line_items: [] }
              : { title: title.trim(), body_text: null },
          ],
          updatedBy: employee.id,
        });
        await queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
        toast.success("Section added.");
      } else {
        await submitReferenceSuggestion({
          documentId: doc.id,
          submittedBy: employee.id,
          what: `${doc.title} — add new section “${title.trim()}”`,
          how: null,
          howYouKnow: why.trim() || null,
        });
        toast.success("Sent to the Owner approval queue.");
      }
      setTitle("");
      setWhy("");
      setOpen(false);
    } catch (error) {
      toast.error("Couldn't save that", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add section
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a section</DialogTitle>
            <DialogDescription>
              {isOwner
                ? "Owner edit — the section is added straight away, then fill it in."
                : "Manager edit — this goes to the Owner approval queue before it goes live."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-section-title">Section title</Label>
              <Input
                id="new-section-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Walk-in cooler"
              />
            </div>
            {!isOwner ? (
              <div className="space-y-1.5">
                <Label htmlFor="new-section-why">Why is it needed?</Label>
                <Textarea
                  id="new-section-why"
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || !employee}>
              {busy ? "Saving…" : isOwner ? "Add section" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}