import type { KeyboardEvent } from "react";

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * Ctrl/Cmd + B / I / U wraps the current selection in the lightweight inline
 * markers that renderFormattedText understands (**bold**, *italic*, __underline__).
 * Works on any plain input or textarea that reports its value through onChange.
 */
export function formatShortcutHandler(onValueChange: (next: string) => void) {
  return (event: KeyboardEvent<Field>) => {
    if (!event.metaKey && !event.ctrlKey) return;
    const key = event.key.toLowerCase();
    const marker = key === "b" ? "**" : key === "i" ? "*" : key === "u" ? "__" : null;
    if (!marker) return;

    event.preventDefault();
    const el = event.currentTarget;
    const text = el.value;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = `${text.slice(0, start)}${marker}${text.slice(start, end)}${marker}${text.slice(end)}`;
    onValueChange(next);

    const caretStart = start + marker.length;
    const caretEnd = caretStart + (end - start);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caretStart, caretEnd);
    });
  };
}
