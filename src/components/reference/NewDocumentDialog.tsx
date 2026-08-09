import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/hooks/useAuth";
import {
  createReferenceDocument,
  departmentLabel,
  departmentOptions,
  locationOptions,
  submitNewDocumentSuggestion,
  type ReferenceDocumentType,
} from "@/lib/reference.queries";

const SHARED = "__shared__";

/**
 * Create a new checklist / SOP. Owners write the row directly (insert RLS is
 * owner-tier); managers send the same proposal through suggestion_queue.
 */
export function NewDocumentDialog({
  documentType,
  label,
}: {
  documentType: ReferenceDocumentType;
  label: string;
}) {
  const { employee, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [locationTag, setLocationTag] = useState<string>(SHARED);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  function start() {
    setTitle("");
    setSubCategory("");
    setDepartments(employee?.department_scope ? [employee.department_scope] : []);
    setLocationTag(SHARED);
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
        await createReferenceDocument({
          documentType,
          title: title.trim(),
          subCategory: subCategory.trim() || null,
          departments,
          locationTag: location,
          updatedBy: employee.id,
        });
        await queryClient.invalidateQueries({ queryKey: ["reference-documents"] });
        toast.success(`${label} created.`);
      } else {
        await submitNewDocumentSuggestion({
          documentType,
          submittedBy: employee.id,
          title: title.trim(),
          subCategory: subCategory.trim() || null,
          departments,
          locationTag: location,
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

  return (
    <>
      <Button onClick={start}>New {label.toLowerCase()}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New {label.toLowerCase()}</DialogTitle>
            <DialogDescription>
              {isOwner
                ? "Owner create — the document is added straight away, empty and ready for sections."
                : "Manager create — this goes to the Owner approval queue before the document exists."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={documentType === "checklist" ? "Kitchen closing" : "Receiving produce"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-sub">Group (optional)</Label>
              <Input
                id="doc-sub"
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
                      disabled={!isOwner && employee?.department_scope !== dept}
                      onCheckedChange={(v) => toggle(dept, v === true)}
                    />
                    {departmentLabel(dept)}
                  </label>
                ))}
              </div>
              {!isOwner ? (
                <p className="text-xs text-muted-foreground">
                  Managers propose documents for their own department.
                </p>
              ) : null}
            </div>

            {documentType === "checklist" ? (
              <div className="space-y-1.5">
                <Label htmlFor="doc-location">Location</Label>
                <Select value={locationTag} onValueChange={setLocationTag}>
                  <SelectTrigger id="doc-location">
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
                <p className="text-xs text-muted-foreground">
                  Checklists usually differ by Market location — pick one unless this run is
                  identical everywhere.
                </p>
              </div>
            ) : (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground underline underline-offset-2">
                  Location (optional) — {locationTag === SHARED ? "shared" : "set"}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Select value={locationTag} onValueChange={setLocationTag}>
                    <SelectTrigger id="doc-location">
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
                </CollapsibleContent>
              </Collapsible>
            )}

            {!isOwner ? (
              <div className="space-y-1.5">
                <Label htmlFor="doc-why">How do you know it&apos;s needed?</Label>
                <Textarea
                  id="doc-why"
                  rows={3}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="What's going wrong today without it."
                />
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || !employee}>
              {busy ? "Saving…" : isOwner ? "Create" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}