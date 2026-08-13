import * as React from "react";
import { Bold, Italic, Underline } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Marker = { label: string; open: string; close: string; icon: typeof Bold };

const markers: Marker[] = [
  { label: "Bold", open: "**", close: "**", icon: Bold },
  { label: "Italic", open: "*", close: "*", icon: Italic },
  { label: "Underline", open: "__", close: "__", icon: Underline },
];

/**
 * Drop-in replacement for Textarea that adds a small bold/italic/underline
 * toolbar. Wrapping is applied to the tracked selection range, because the
 * textarea has already blurred by the time a toolbar click handler runs.
 */
export const FormattingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, onChange, onSelect, disabled, value, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [range, setRange] = React.useState<[number, number]>([0, 0]);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  function apply(marker: Marker) {
    const el = innerRef.current;
    if (!el || disabled) return;
    const text = String(value ?? el.value ?? "");
    const [start, end] = range;
    const s = Math.min(Math.max(start, 0), text.length);
    const e = Math.min(Math.max(end, 0), text.length);
    const selected = text.slice(s, e);
    const next = `${text.slice(0, s)}${marker.open}${selected}${marker.close}${text.slice(e)}`;

    onChange?.({
      ...({} as React.ChangeEvent<HTMLTextAreaElement>),
      target: { ...el, value: next } as unknown as HTMLTextAreaElement,
      currentTarget: { ...el, value: next } as unknown as HTMLTextAreaElement,
    } as React.ChangeEvent<HTMLTextAreaElement>);

    const selStart = s + marker.open.length;
    const selEnd = selStart + selected.length;
    setRange([selStart, selEnd]);
    requestAnimationFrame(() => {
      const node = innerRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(selStart, selEnd);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0.5">
        {markers.map((marker) => {
          const Icon = marker.icon;
          return (
            <Button
              key={marker.label}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={disabled}
              title={marker.label}
              aria-label={marker.label}
              onClick={() => apply(marker)}
            >
              <Icon className="size-4" aria-hidden />
            </Button>
          );
        })}
      </div>
      <Textarea
        {...props}
        value={value}
        disabled={disabled}
        ref={setRefs}
        className={cn(className)}
        onChange={onChange}
        onSelect={(event) => {
          const el = event.currentTarget;
          setRange([el.selectionStart ?? 0, el.selectionEnd ?? 0]);
          onSelect?.(event);
        }}
      />
    </div>
  );
});
FormattingTextarea.displayName = "FormattingTextarea";
