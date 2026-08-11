import {
  Camera,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Video,
  type LucideIcon,
} from "lucide-react";

import type { StepRow } from "@/lib/training.queries";

type Style = { icon: LucideIcon; label: string; className: string };

const styles: Record<StepRow["step_type"], Style> = {
  text: { icon: FileText, label: "Read", className: "bg-secondary text-secondary-foreground" },
  photo: { icon: Camera, label: "Photo", className: "bg-info-soft text-info" },
  video: { icon: Video, label: "Watch", className: "bg-primary/12 text-primary" },
  quiz: { icon: HelpCircle, label: "Quiz", className: "bg-warning-soft text-warning" },
  doing_signoff: {
    icon: ClipboardCheck,
    label: "Trainer sign-off",
    className: "bg-accent/20 text-accent-foreground",
  },
  supervised_live_practice: {
    icon: ClipboardCheck,
    label: "Live practice",
    className: "bg-accent/20 text-accent-foreground",
  },
};

/** Colour-coded step-type chip so a module list scans at a glance. */
export function StepTypeChip({ type }: { type: StepRow["step_type"] }) {
  const style = styles[type] ?? styles.text;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
    >
      <Icon className="size-3" aria-hidden />
      {style.label}
    </span>
  );
}