/**
 * Rhetoric module, output transformer.
 *
 * Strips emoji-headed sections + emoji bullets (preserves visual scanning rhythm).
 * Splits long sentences on coordinating conjunctions (keeps clauses short, preserves vocabulary).
 * Strips code blocks in chat context (Discord-formatting doctrine).
 * Collapses excessive blank lines (chat density).
 *
 * Doctrine: rendering preferences live HERE, never in the AI's system prompt.
 * The AI greets the user as a person; this module shapes what reaches them.
 */

import { json, Env } from "./common";

interface TransformRequest {
  text: string;
  context?: "chat" | "doc" | "code-explain" | "reflection";
}

const MAX_SENTENCE_WORDS = 25;

function stripEmojiHeaders(text: string): { text: string; changed: boolean } {
  const pat = /^(#{1,6})\s+(\p{Extended_Pictographic}️?\s*)+/gmu;
  let changed = false;
  const out = text.replace(pat, (_m, hashes) => {
    changed = true;
    return `${hashes} `;
  });
  return { text: out, changed };
}

function stripEmojiBullets(text: string): { text: string; changed: boolean } {
  const pat = /^(\s*[-*+]\s+)(\p{Extended_Pictographic}️?\s*)+/gmu;
  let changed = false;
  const out = text.replace(pat, (_m, prefix) => {
    changed = true;
    return prefix;
  });
  return { text: out, changed };
}

function splitLongSentences(text: string): {
  text: string;
  changed: boolean;
  unsplittable: number;
} {
  const lines = text.split("\n");
  let changed = false;
  let unsplittable = 0;
  const result = lines.map((line) => {
    if (
      line.startsWith("```") ||
      line.startsWith("    ") ||
      /^#{1,6}\s/.test(line) ||
      /^\s*[-*+]\s/.test(line) ||
      /^\s*\d+\.\s/.test(line) ||
      line.trim() === ""
    ) {
      return line;
    }
    const sentences = line.split(/(?<=[.!?])\s+/);
    const rewritten = sentences.map((s) => {
      const wc = s.trim().split(/\s+/).length;
      if (wc <= MAX_SENTENCE_WORDS) return s;
      const parts = s.split(/\s*(?:;|, |–| - )\s*/);
      if (parts.length > 1) {
        changed = true;
        return parts.map((p) => p.trim()).filter(Boolean).join(". ");
      }
      // coordinating conjunctions only (and/but/so), capitalize new sentence
      const cc = s.split(/,\s+(?:and|but|so)\s+/);
      if (cc.length > 1) {
        changed = true;
        return cc
          .map((p, i) => {
            const t = p.trim();
            if (i === 0 || t.length === 0) return t;
            return t.charAt(0).toUpperCase() + t.slice(1);
          })
          .filter(Boolean)
          .join(". ");
      }
      unsplittable += 1;
      return s;
    });
    return rewritten.join(" ");
  });
  return { text: result.join("\n"), changed, unsplittable };
}

function stripCodeBlocksForChat(
  text: string,
  context: TransformRequest["context"],
): { text: string; changed: boolean } {
  if (context !== "chat") return { text, changed: false };
  const pat = /```[\s\S]*?```/g;
  let changed = false;
  const out = text.replace(pat, (block) => {
    changed = true;
    return block
      .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  });
  return { text: out, changed };
}

function collapseBlankLines(text: string): { text: string; changed: boolean } {
  if (!/\n{3,}/.test(text)) return { text, changed: false };
  return { text: text.replace(/\n{3,}/g, "\n\n"), changed: true };
}

export async function handleTransform(
  request: Request,
  _env: Env,
): Promise<Response> {
  let body: TransformRequest;
  try {
    body = (await request.json()) as TransformRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (typeof body.text !== "string") {
    return json({ error: "Missing or invalid 'text' field" }, 400);
  }
  if (body.text.trim() === "") {
    return json({ text: "", applied: [], warnings: ["empty-input"] });
  }

  const applied: string[] = [];
  const warnings: string[] = [];
  let text = body.text;

  const r1 = stripEmojiHeaders(text);
  if (r1.changed) applied.push("strip-emoji-headers");
  text = r1.text;

  const r2 = stripEmojiBullets(text);
  if (r2.changed) applied.push("strip-emoji-bullets");
  text = r2.text;

  const r3 = splitLongSentences(text);
  if (r3.changed) applied.push("split-long-sentences");
  if (r3.unsplittable > 0) {
    warnings.push(`unsplittable-long-sentences: ${r3.unsplittable}`);
  }
  text = r3.text;

  const r4 = stripCodeBlocksForChat(text, body.context);
  if (r4.changed) applied.push("strip-code-blocks-chat");
  text = r4.text;

  const r5 = collapseBlankLines(text);
  if (r5.changed) applied.push("collapse-blank-lines");
  text = r5.text;

  return json({ text, applied, warnings });
}
