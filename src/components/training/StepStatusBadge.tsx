import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/training.queries";

export function StepStatusBadge({ status }: { status: ContentStatus }) {
  if (status === "ready") return null;
  if (status === "needs_restructuring") {
    return (
      <Badge variant="secondary" className="text-[11px] font-medium">
        Being refined
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
      Coming soon
    </Badge>
  );
}
