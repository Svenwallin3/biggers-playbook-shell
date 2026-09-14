import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WYSIWYG field for the lightweight inline markup used across step content
 * (`**bold**`, `*italic*`, `__underline__`). The admin sees real bold/italic/
 * underline text while typing; the value is still stored with markers so the
 * trainee-facing renderer is unchanged.
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const MARKER_RE = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*/g;

export function markersToHtml(value: string) {
  if (!value) return "";
  let out = "";
  let last = 0;
  MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKER_RE.exec(value)) !== null) {
    out += escapeHtml(value.slice(last, match.index));
    if (match[1] !== undefined) out += `<b>${escapeHtml(match[1])}</b>`;
    else if (match[2] !== undefined) out += `<u>${escapeHtml(match[2])}</u>`;
    else if (match[3] !== undefined) out += `<i>${escapeHtml(match[3])}</i>`;
    last = match.index + match[0].length;
  }
  out += escapeHtml(value.slice(last));
  return out.replace(/\n/g, "<br>");
}

function wrap(inner: string, marker: string) {
  if (!inner.trim()) return inner;
  const leading = inner.match(/^\s*/)?.[0] ?? "";
  const trailing = inner.match(/\s*$/)?.[0] ?? "";
  const core = inner.slice(leading.length, inner.length - trailing.length);
  return `${leading}${marker}${core}${marker}${trailing}`;
}

function nodeToMarkers(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName;
  if (tag === "BR") return "\n";
  let inner = Array.from(node.childNodes).map(nodeToMarkers).join("");
  const weight = node.style.fontWeight;
  const isBold =
    tag === "B" || tag === "STRONG" || weight === "bold" || Number(weight) >= 600;
  const isItalic = tag === "I" || tag === "EM" || node.style.fontStyle === "italic";
  const isUnderline =
    tag === "U" || (node.style.textDecoration || "").includes("underline");
  if (isBold) inner = wrap(inner, "**");
  if (isItalic) inner = wrap(inner, "*");
  if (isUnderline) inner = wrap(inner, "__");
  if (tag === "DIV" || tag === "P") inner += "\n";
  return inner;
}

function htmlToMarkers(root: HTMLElement) {
  const text = Array.from(root.childNodes).map(nodeToMarkers).join("");
  return text.replace(/\n$/, "");
}

export function RichTextField({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  toolbar = true,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  toolbar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmitted.current) {
      el.innerHTML = markersToHtml(value);
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const next = htmlToMarkers(el);
    lastEmitted.current = next;
    onChange(next);
  };

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    ref.current?.focus();
    document.execCommand(command);
    emit();
  };

  const isEmpty = !value;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <div
          ref={ref}
          role="textbox"
          aria-multiline={multiline}
          aria-label={placeholder}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "min-h-9 w-full whitespace-pre-wrap break-words rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onInput={emit}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onFocus={() => setFocused(true)}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, multiline ? text : text.replace(/\n/g, " "));
          }}
          onKeyDown={(e) => {
            if (!multiline && e.key === "Enter") {
              e.preventDefault();
              return;
            }
            if (!(e.metaKey || e.ctrlKey)) return;
            const key = e.key.toLowerCase();
            if (key === "b" || key === "i" || key === "u") {
              e.preventDefault();
              applyFormat(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
            }
          }}
        />
        {isEmpty && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        ) : null}
      </div>
      {toolbar && (focused || !isEmpty) ? (
        <div className="mt-1 flex items-center gap-1">
          {(
            [
              ["bold", Bold, "Bold"],
              ["italic", Italic, "Italic"],
              ["underline", Underline, "Underline"],
            ] as const
          ).map(([cmd, Icon, label]) => (
            <button
              key={cmd}
              type="button"
              title={`${label} (⌘/Ctrl+${label[0]})`}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat(cmd)}
            >
              <Icon className="size-3.5" />
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
