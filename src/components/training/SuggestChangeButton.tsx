import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
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

export function SuggestChangeButton({
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
      toast.error("Sign in to suggest a change.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("suggestion_queue").insert({
      step_id: stepId,
      module_id: moduleId ?? null,
      submitted_by: employee.id,
      field_what: stepTitle,
      field_how: reason.trim(),
      payload: { type: "feedback" },
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send that suggestion", { description: error.message });
      return;
    }
    setOpen(false);
    setReason("");
    toast.success("Sent for review");
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
        <MessageSquarePlus className="size-3.5" />
        Suggest a change
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest a change</DialogTitle>
            <DialogDescription>
              Tell us what is wrong, missing, or confusing on &ldquo;{stepTitle}&rdquo;. It goes to
              your General Manager and ownership. Nothing changes until they review it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What should change, and why?"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !reason.trim()}>
              {busy ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
