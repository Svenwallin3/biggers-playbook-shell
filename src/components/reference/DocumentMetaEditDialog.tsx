import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  departmentLabel,
  departmentOptions,
  locationLabel,
  locationOptions,
  submitReferenceSuggestion,
  updateReferenceDocumentMeta,
  type ReferenceDocumentRow,
  type ReferenceDocumentType,
} from "@/lib/reference.queries";

const SHARED = "__shared__";

/**
 * Edit a document's own details (title / group / departments / location).
 * Owners write directly; managers route the same change through suggestion_queue.
 */
export function DocumentMetaEditDialog({
  doc,
  documentType,
}: {
  doc: ReferenceDocumentRow;
  documentType: ReferenceDocumentType;
}) {
  const { employee, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [subCategory, setSubCategory] = useState(doc.sub_category ?? "");
  const [departments, setDepartments] = useState<string[]>(doc.departments ?? []);
  const [locationTag, setLocationTag] = useState<string>(doc.location_tag ?? SHARED);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  function start(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setTitle(doc.title);
    setSubCategory(doc.sub_category ?? "");
    setDepartments(doc.departments ?? []);
    setLocationTag(doc.location_tag ?? SHARED);
    setWhy("");
    setOpen(true);
  }

  function toggle(dept: string, checked: boolean) {
    setDepartments((prev) =>
      checked ? [...new Set([...prev, dept])] : prev.filter((d) => d !== dept),
    );
  }

  async function save() {
    if (!employee) return;
    if (!title.trim()) {
      toast.error("A title is required.");
      return;
    }
    setBusy(true);
    const location = locationTag === SHARED ? null : locationTag;
    try {
      if (isOwner) {
        await updateReferenceDocumentMeta({
          id: doc.id,
          title: title.trim(),
          subCategory: subCategory.trim() || null,
          departments,
          locationTag: location,
          updatedBy: employee.id,
        });
        await queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
        toast.success("Document details updated.");
      } else {
        const summary = [
          `Title: ${title.trim()}`,
          `Group: ${subCategory.trim() || "—"}`,
          `Departments: ${departments.map(departmentLabel).join(", ") || "—"}`,
          `Location: ${locationLabel(location)}`,
        ].join("\n");
        await submitReferenceSuggestion({
          documentId: doc.id,
          submittedBy: employee.id,
          what: `${doc.title} — document details (title/group/departments/location)`,
          how: summary,
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

  const locationSelect = (
    <Select value={locationTag} onValueChange={setLocationTag}>
      <SelectTrigger id={`meta-location-${doc.id}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SHARED}>No specific location (shared)</SelectItem>
        {locationOptions.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit document details"
            onClick={start}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document details</DialogTitle>
            <DialogDescription>
              {isOwner
                ? "Owner edit — saves straight away and records version history."
                : "Manager edit — this goes to the Owner approval queue before it goes live."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`meta-title-${doc.id}`}>Title</Label>
              <Input
                id={`meta-title-${doc.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`meta-sub-${doc.id}`}>Group (optional)</Label>
              <Input
                id={`meta-sub-${doc.id}`}
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Opening, Closing, Cleaning…"
              />
            </div>
            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="grid grid-cols-2 gap-2">
                {departmentOptions.map((dept) => (
                  <label key={dept} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={departments.includes(dept)}
                      onCheckedChange={(v) => toggle(dept, v === true)}
                    />
                    {departmentLabel(dept)}
                  </label>
                ))}
              </div>
            </div>

            {documentType === "checklist" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`meta-location-${doc.id}`}>Location</Label>
                {locationSelect}
              </div>
            ) : (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-2">
                  Location (optional) — {locationTag === SHARED ? "shared" : "set"}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">{locationSelect}</CollapsibleContent>
              </Collapsible>
            )}

            {!isOwner ? (
              <div className="space-y-1.5">
                <Label htmlFor={`meta-why-${doc.id}`}>How do you know it should change?</Label>
                <Textarea
                  id={`meta-why-${doc.id}`}
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
              {busy ? "Saving…" : isOwner ? "Save details" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}