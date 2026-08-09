import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { PhotoUpload } from "@/components/PhotoUpload";
import { useAuth } from "@/hooks/useAuth";
import { assignableStaffQueryOptions, createDeliveryIssue } from "@/lib/delivery.queries";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function ReportDeliveryIssueDialog({ open, onOpenChange }: Props) {
  const { employee, isManagerOrOwner } = useAuth();
  const queryClient = useQueryClient();
  const staffQuery = useQuery({ ...assignableStaffQueryOptions(), enabled: open });

  const [productVendor, setProductVendor] = useState("");
  const [issue, setIssue] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function reset() {
    setProductVendor("");
    setIssue("");
    setAssignedTo("");
    setPhotoUrl(null);
  }

  const submit = useMutation({
    mutationFn: () =>
      createDeliveryIssue({
        productVendor: productVendor.trim(),
        issueDescription: issue.trim(),
        photoUrl,
        reportedBy: employee?.id ?? null,
        assignedTo: assignedTo || null,
      }),
    onSuccess: () => {
      toast.success("Delivery issue reported.");
      reset();
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["delivery-issues"] });
    },
    onError: (error: Error) =>
      toast.error("Couldn't submit the report", { description: error.message }),
  });

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!productVendor.trim() || !issue.trim()) {
      toast.error("Add the product or vendor and what went wrong.");
      return;
    }
    submit.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Report a delivery issue</DialogTitle>
            <DialogDescription>
              Goes straight to the person you pick — no approval step.
            </DialogDescription>
          </DialogHeader>

          {isManagerOrOwner ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product-vendor">Product or vendor</Label>
                <Input
                  id="product-vendor"
                  maxLength={120}
                  value={productVendor}
                  onChange={(e) => setProductVendor(e.target.value)}
                  placeholder="Heirloom tomatoes — Sunset Ridge Produce"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue">What was wrong?</Label>
                <Textarea
                  id="issue"
                  rows={4}
                  maxLength={800}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Half the case arrived bruised and two flats were short."
                />
              </div>

              <PhotoUpload
                folder="delivery-issues"
                value={photoUrl}
                onChange={setPhotoUrl}
                label="Photo (optional)"
                helpText="A picture of the damaged product helps whoever follows up."
              />

              <div className="space-y-2">
                <Label htmlFor="assigned-to">Send to</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger id="assigned-to">
                    <SelectValue placeholder="Pick a manager or owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(staffQuery.data ?? []).map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.full_name || person.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              Delivery issues are reported by managers and owners. Let your manager know and
              they&apos;ll log it.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {isManagerOrOwner ? "Cancel" : "Close"}
            </Button>
            {isManagerOrOwner ? (
              <Button type="submit" disabled={submit.isPending}>
                Submit report
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}