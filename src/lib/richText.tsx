import type { ReactNode } from "react";

const MARKER_RE = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*/g;

/**
 * Tokenizes lightweight inline markup layered on top of plain-text content:
 * `**bold**`, `*italic*`, `__underline__`. Unpaired markers render literally.
 */
export function renderFormattedText(text: string | null | undefined): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKER_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`b${key++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<u key={`u${key++}`}>{match[2]}</u>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`i${key++}`}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Strips inline markers, leaving clean readable text (used for print sheets). */
export function stripFormattingMarkup(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(MARKER_RE, (_m, b, u, i) => b ?? u ?? i ?? "");
}
