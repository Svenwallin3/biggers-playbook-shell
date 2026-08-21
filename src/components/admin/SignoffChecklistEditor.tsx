import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SignoffChecklistItem } from "@/lib/training.queries";

const EVERYONE = "__everyone__";

/**
 * Repeatable list editor for `steps.signoff_checklist`. Rendered only for
 * trainer-certification step types, and only for GM/Owner (canEditDirect).
 */
export function SignoffChecklistEditor({
  items,
  disabled = false,
  onChange,
}: {
  items: SignoffChecklistItem[];
  disabled?: boolean;
  onChange: (items: SignoffChecklistItem[]) => void;
}) {
  const patch = (i: number, p: Partial<SignoffChecklistItem>) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...p } : item)));

  const move = (i: number, delta: number) => {
    const target = i + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(i, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3">
      <div>
        <Label className="text-sm">Sign-off checklist (optional)</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Items a trainer must confirm before the Sign Off button unlocks. Leave empty for an
          ungated sign-off. Division-scoped items only show for a trainee in that division.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No checklist items yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Input
                className="h-9 min-w-[12rem] flex-1"
                value={item.text}
                maxLength={200}
                disabled={disabled}
                onChange={(e) => patch(i, { text: e.target.value })}
                placeholder="Scenario or item covered…"
                aria-label={`Checklist item ${i + 1}`}
              />
              <Select
                value={item.department ?? EVERYONE}
                disabled={disabled}
                onValueChange={(v) =>
                  patch(i, {
                    department:
                      v === EVERYONE ? null : (v as NonNullable<SignoffChecklistItem["department"]>),
                  })
                }
              >
                <SelectTrigger className="h-9 w-36" aria-label={`Division for item ${i + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERYONE}>Everyone</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={disabled || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={`Move item ${i + 1} up`}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={disabled || i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move item ${i + 1} down`}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  aria-label={`Remove item ${i + 1}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => onChange([...items, { text: "", department: null }])}
      >
        <Plus className="size-4" />
        Add item
      </Button>
    </div>
  );
}

/** Drops blank rows before persisting; empty list is stored as null. */
export function serializeChecklist(items: SignoffChecklistItem[]) {
  const clean = items
    .map((item) => ({
      text: item.text.trim(),
      ...(item.department ? { department: item.department } : {}),
    }))
    .filter((item) => item.text.length > 0);
  return clean.length ? clean : null;
}
