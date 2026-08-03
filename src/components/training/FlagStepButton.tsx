import { Flag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function FlagStepButton({ stepTitle }: { stepTitle: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast("Step flagged for your manager", { description: stepTitle });
      }}
    >
      <Flag className="size-3.5" />
      Flag
    </Button>
  );
}