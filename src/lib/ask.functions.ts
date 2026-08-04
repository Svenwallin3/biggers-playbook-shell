import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AskInput = z.object({
  question: z.string().min(2).max(500),
  sources: z
    .array(
      z.object({
        ref: z.string(),
        label: z.string(),
        sublabel: z.string(),
        text: z.string(),
      }),
    )
    .max(12),
});

export type AskAnswer = {
  answered: boolean;
  answer: string;
  usedRefs: string[];
};

const NO_MATCH =
  "I don't have that in the system yet — check with a manager.";

const SYSTEM = `You are the Biggers Market training assistant for staff on the floor.
Answer ONLY from the numbered CONTENT below. It is the company's own training and sourcing content.
Rules:
- Never use outside knowledge, never guess, never fill gaps. Safety details (temperatures, hold times, procedures) must be quoted exactly as written or not stated at all.
- If the content does not clearly answer the question, set answered=false and use exactly this answer text: "${NO_MATCH}"
- When you do answer, be short, plain-spoken and conversational (1-3 sentences), like a helpful coworker.
- Spell out abbreviations on first use, e.g. "First In, First Out (FIFO)".
- List the ref strings of every content item you used in used_refs.
Reply with JSON only.`;

export const askTraining = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AskInput.parse(data))
  .handler(async ({ data }): Promise<AskAnswer> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "Lovable AI is not enabled for this project yet. An owner needs to open Project Settings and enable Lovable AI (this provisions LOVABLE_API_KEY) — no separate provider key is needed.",
      );
    }

    if (!data.sources.length) {
      return { answered: false, answer: NO_MATCH, usedRefs: [] };
    }

    const content = data.sources
      .map((s, i) => `[${i + 1}] ref=${s.ref} | ${s.label} (${s.sublabel})\n${s.text}`)
      .join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        instructions: SYSTEM,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `QUESTION: ${data.question}\n\nCONTENT:\n${content}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "grounded_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answered: { type: "boolean" },
                answer: { type: "string" },
                used_refs: { type: "array", items: { type: "string" } },
              },
              required: ["answered", "answer", "used_refs"],
            },
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The assistant is busy right now — try again in a moment.");
      if (res.status === 402)
        throw new Error("Lovable AI credits are used up. An owner can add credits in Settings → Plans & credits.");
      throw new Error(`The assistant couldn't answer (${res.status}). ${detail.slice(0, 200)}`);
    }

    // Streamed SSE: accumulate the output text deltas.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          } else if (event.type === "response.completed" && event.response?.output_text) {
            if (!text) text = event.response.output_text;
          }
        } catch {
          // ignore keep-alive / non-JSON frames
        }
      }
    }

    try {
      const parsed = JSON.parse(text) as {
        answered?: boolean;
        answer?: string;
        used_refs?: string[];
      };
      const answered = parsed.answered === true && Boolean(parsed.answer);
      return {
        answered,
        answer: answered ? parsed.answer! : NO_MATCH,
        usedRefs: answered ? (parsed.used_refs ?? []) : [],
      };
    } catch {
      return { answered: false, answer: NO_MATCH, usedRefs: [] };
    }
  });