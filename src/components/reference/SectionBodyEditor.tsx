import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  docSections,
  saveReferenceSections,
  submitReferenceSuggestion,
  type ReferenceDocumentRow,
  type ReferenceSection,
} from "@/lib/reference.queries";

/**
 * SOP equivalent of LineItemEditor: one section's title + body text.
 * Owners write directly; managers route through suggestion_queue.
 */
export function SectionBodyEditor({
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  const sections = docSections(doc);
  const section = sections[sectionIndex];

  function start() {
    setTitle(section?.title ?? "");
    setBody(section?.body_text ?? "");
    setWhy("");
    setOpen(true);
  }

  function nextSections(): ReferenceSection[] {
    return sections.map((s, i) =>
      i === sectionIndex ? { ...s, title: title.trim(), body_text: body.trim() || null } : s,
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
        await submitReferenceSuggestion({
          documentId: doc.id,
          submittedBy: employee.id,
          what: `${doc.title} — “${title.trim() || section?.title || "Section"}” body text`,
          how: body.trim() || null,
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
            aria-label="Edit section"
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
                ? "Owner edit — saves straight to the SOP and records version history."
                : "Manager edit — this goes to the Owner approval queue before it goes live."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="section-title">Section title</Label>
              <Input
                id="section-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section-body">Body text</Label>
              <Textarea
                id="section-body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="One idea per line. Spell out every abbreviation the first time it's used."
              />
            </div>
            {!canWriteDirect ? (
              <div className="space-y-1.5">
                <Label htmlFor="section-why">How do you know it should change?</Label>
                <Textarea
                  id="section-why"
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="What you'd check before you'd sign off on it."
                />
              </div>
            ) : null}
          </div>

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