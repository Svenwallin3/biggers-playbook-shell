import { useState } from "react";
import { Flag } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function FlagStepButton({
  stepId,
  stepTitle,
  moduleId,
}: {
  stepId: string;
  stepTitle: string;
  moduleId?: string;
}) {
  const { employee } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!employee) {
      toast.error("Sign in to flag a step.");
      return;
    }
    setBusy(true);
    // Flags land in the suggestion queue as a pending item from this employee,
    // which is what their manager reviews.
    const { error } = await supabase.from("suggestion_queue").insert({
      step_id: stepId,
      module_id: moduleId ?? null,
      submitted_by: employee.id,
      field_what: `FLAG: ${stepTitle}`,
      field_how: reason.trim() || null,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send that flag", { description: error.message });
      return;
    }
    setOpen(false);
    setReason("");
    toast("Step flagged for your manager", { description: stepTitle });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Flag className="size-3.5" />
        Flag
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this step</DialogTitle>
            <DialogDescription>
              This goes to your manager. Tell them what looked wrong or confusing about &ldquo;
              {stepTitle}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's off about this step?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? "Sending…" : "Send flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
