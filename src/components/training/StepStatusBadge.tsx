import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/training.queries";

const styles: Record<
  Exclude<ContentStatus, "ready">,
  { label: string; className: string }
> = {
  needs_restructuring: {
    label: "Being refined",
    className: "border-warning/40 bg-warning-soft text-warning",
  },
  missing: {
    label: "Coming soon",
    className: "border-info/30 bg-info-soft text-info",
  },
  blocked: {
    label: "Blocked",
    className: "border-destructive/40 bg-destructive-soft text-destructive",
  },
};

export function StepStatusBadge({ status }: { status: ContentStatus }) {
  if (status === "ready") return null;
  const style = styles[status];
  if (!style) return null;
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[11px] font-semibold uppercase tracking-wide ${style.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {style.label}
    </Badge>
  );
}
