/**
 * mcp, the felt win. One URL pasted into Claude, ChatGPT, or any MCP client,
 * and that AI knows its person: identity first, memories on demand, new
 * memories writable. Minimal Streamable-HTTP MCP server (JSON responses,
 * single-message exchanges, no SSE needed for this tool surface).
 *
 * Route: POST /mcp/:token, token in path because most chat clients accept a
 * bare URL and no custom headers. It is the deployer's own token on their own
 * account; rotate by rotating DEMO_TOKEN. GET returns a human-readable hint.
 */
import { Env, json, newId } from "./common";
import { getIdentityDoc } from "./identity";
import { getLatestEntry } from "./substrate";

const PROTOCOL = "2025-06-18";

const TOOLS = [
  {
    name: "get_identity",
    description:
      "Read who this person is, what they're working toward, and how they want to be spoken to. Call this FIRST in any new conversation.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "set_identity",
    description:
      "Store one approved identity field during or after the intake interview. ONLY call this with wording the person has explicitly approved, draft it, read it back, then store. Keys: call_me, who_i_am, current_focus, voice_rules, anti_rules, contract.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "call_me | who_i_am | current_focus | voice_rules | anti_rules | contract" },
        value: { type: "string", description: "the approved text, in the person's own words" },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
  },
  {
    name: "recall_memories",
    description:
      "Search this person's memory store. Use plain keywords from the current topic.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "keywords to search" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "where_was_i",
    description:
      "When the person returns, after an hour or a month, call this for one forward-leaning sentence to restart momentum. NEVER compute or mention how long they were gone; absence carries no debt here.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "hold_this",
    description:
      "When the person has to stop, or names something they can't hold right now, park it on their shelf. Confirm it's held; never add urgency or a deadline.",
    inputSchema: {
      type: "object",
      properties: { body: { type: "string", description: "the thread to hold, in their words" } },
      required: ["body"],
      additionalProperties: false,
    },
  },
  {
    name: "whats_open",
    description:
      "When the person asks what's on their shelf or what they left open, return ONE held thread, the harness never presents menus. They can ask again for the next, mark it done, or release it.",
    inputSchema: {
      type: "object",
      properties: { action: { type: "string", description: "next (default) | done:<id> | release:<id>" } },
      additionalProperties: false,
    },
  },
  {
    name: "correct_me",
    description:
      "When the person corrects how you speak to them or what you assumed about them ('that's not how I'd say it', 'never do X with me'), store the correction as a durable voice rule so it survives this conversation. Quote their correction faithfully.",
    inputSchema: {
      type: "object",
      properties: {
        rule: { type: "string", description: "the correction, as a standing rule in the person's own terms" },
        kind: { type: "string", description: "voice (how to speak) | anti (never do this)" },
      },
      required: ["rule"],
      additionalProperties: false,
    },
  },
  {
    name: "remember",
    description:
      "Store one durable memory for this person (a fact, decision, or context worth keeping). Only store what they said or clearly decided.",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string", description: "the memory, one to three sentences" },
        type: { type: "string", description: "fact | decision | context | preference" },
      },
      required: ["body"],
      additionalProperties: false,
    },
  },
];

function rpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: unknown, code: number, message: string): Response {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}
function textContent(text: string) {
  return { content: [{ type: "text", text }] };
}

export async function handleMcp(request: Request, env: Env, token: string): Promise<Response> {
  if (!token || token !== env.DEMO_TOKEN) return json({ error: "Unauthorized" }, 401);
  if (request.method === "GET")
    return json({
      mcp: "northwoods-pack",
      protocol: PROTOCOL,
      hint: "POST JSON-RPC here. Tools: get_identity, recall_memories, remember, correct_me.",
    });

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: any };
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  const { id, method, params } = msg;

  if (method === "initialize")
    return rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "northwoods-pack", version: "0.5.0" },
    });
  if (method === "notifications/initialized") return new Response(null, { status: 202 });
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      if (name === "get_identity") {
        const doc = await getIdentityDoc(env);
        // Empty pot => the connected AI becomes the intake. A blank form asks a
        // person to articulate themselves cold, the exact skill this pack's
        // cohort burns energy on. A conversation with drafts to approve doesn't.
        return rpcResult(
          id,
          textContent(doc ?? [
            "This pot is empty, and YOU are the intake. Interview the person you're talking to, gently, ONE question at a time, in this order:",
            "1. What should I call you?  (store key: call_me)",
            "2. Who are you?, let them ramble; offer to draft it FROM the ramble rather than asking for a clean answer.  (key: who_i_am)",
            "3. What are you building or chasing right now?  (key: current_focus)",
            "4. How should an AI speak to you?, offer concrete options to react to (direct? short? no pep talks? no option-lists?); recognition beats articulation.  (key: voice_rules)",
            "5. What should an AI NEVER do with you?, again, offer examples: cheerleading, hedging, lectures, time pressure.  (key: anti_rules)",
            "6. EVIDENCE BEATS DESCRIPTION, invite them to SHOW you instead of telling you: a photo of their bookshelf, their desk, their workbench, anything they live with. Describe what you actually see, guess gently at what it says about them, and let them correct you. Store each CONFIRMED observation with remember (type: context).",
            "7. Ask for a piece of writing they made themselves, without AI, an old email, a journal scrap, a post. Store it verbatim with remember (type: voice_sample), it is the seed their voice gets checked against later, and offer to draft who_i_am FROM their own words rather than asking them to produce a self-description cold.",
            "RULES: one question per turn, never a form. After each answer, DRAFT the field in their words, read it back, and only call set_identity after they approve. If they correct you, that IS the data. Anything worth keeping beyond identity goes in remember.",
          ].join("\n")),
        );
      }
      if (name === "set_identity") {
        const key = String(args.key ?? "").trim();
        const value = String(args.value ?? "").trim();
        const VALID = ["call_me", "who_i_am", "current_focus", "voice_rules", "anti_rules", "contract"];
        if (!VALID.includes(key)) return rpcResult(id, textContent(`key must be one of: ${VALID.join(", ")}`));
        if (!value) return rpcResult(id, textContent("Empty value."));
        await env.DB.prepare(
          "INSERT INTO identity_fields (key, value, source, updated_at) VALUES (?, ?, 'interview-via-ai', ?) " +
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = 'interview-via-ai', updated_at = excluded.updated_at",
        )
          .bind(key, value, Date.now())
          .run();
        return rpcResult(id, textContent(`Stored ${key}. Read the full identity back with get_identity when the interview feels done.`));
      }
      if (name === "recall_memories") {
        const q = String(args.query ?? "").trim();
        if (!q) return rpcResult(id, textContent("Empty query."));
        // loam's search layer: FTS5 match, then provenance join. Recall excludes
        // sensitivity='secret' by default, the egress rule is bound at the query,
        // not left as advice (tag now, enforce here).
        const ftsQuery = q.split(/\s+/).slice(0, 6).map((t) => `"${t.replace(/"/g, "")}"`).join(" OR ");
        const rows = await env.DB.prepare(
          `SELECT e.type, e.body, e.source, e.trust_level FROM entries_fts f
           JOIN substrate_entries e ON e.id = f.entry_id
           WHERE entries_fts MATCH ? AND e.sensitivity != 'secret'
           ORDER BY e.created_at DESC LIMIT 12`,
        )
          .bind(ftsQuery)
          .all<{ type: string; body: string; source: string; trust_level: string }>();
        const hits = rows.results ?? [];
        return rpcResult(
          id,
          textContent(
            hits.length
              ? hits.map((h) => `[${h.type} · ${h.source} · ${h.trust_level}] ${h.body}`).join("\n")
              : "No matching memories.",
          ),
        );
      }
      if (name === "where_was_i") {
        const latest = await getLatestEntry(env);
        const snippet = latest ? (latest.body.length > 140 ? latest.body.slice(0, 137).trimEnd() + "..." : latest.body) : null;
        const loop = await env.DB.prepare(
          "SELECT body FROM loops WHERE status='open' ORDER BY created_at DESC LIMIT 1",
        ).first<{ body: string }>();
        // One sentence, forward-leaning. Never timestamps, never counts, never
        // verdicts about absence, the resume doctrine, served over MCP.
        const line = loop
          ? `Welcome back. The thread you asked me to hold: ${loop.body}`
          : snippet
            ? `Welcome back. Pick up where it was warm: ${snippet}`
            : "Welcome back. Nothing's owed, start with what's on your mind right now.";
        return rpcResult(id, textContent(line));
      }
      if (name === "hold_this") {
        const body = String(args.body ?? "").trim();
        if (!body) return rpcResult(id, textContent("Nothing to hold."));
        await env.DB.prepare(
          "INSERT INTO loops (id, body, status, created_at) VALUES (?, ?, 'open', ?)",
        )
          .bind(newId(), body, Date.now())
          .run();
        return rpcResult(id, textContent("Held. It's on your shelf, not in your head. Nothing about it will nag you."));
      }
      if (name === "whats_open") {
        const action = String(args.action ?? "next").trim();
        const m = action.match(/^(done|release):(\w+)$/);
        if (m) {
          await env.DB.prepare("UPDATE loops SET status=?, closed_at=? WHERE id=?")
            .bind(m[1] === "done" ? "done" : "released", Date.now(), m[2])
            .run();
          return rpcResult(id, textContent(m[1] === "done" ? "Closed. Good." : "Released, off the shelf, no ceremony."));
        }
        // ONE loop at a time, a menu is how threads die and the person becomes
        // the continuity. Oldest first, so nothing quietly rots at the bottom.
        const row = await env.DB.prepare(
          "SELECT id, body FROM loops WHERE status='open' ORDER BY created_at ASC LIMIT 1",
        ).first<{ id: string; body: string }>();
        const count = await env.DB.prepare("SELECT COUNT(*) as n FROM loops WHERE status='open'").first<{ n: number }>();
        if (!row) return rpcResult(id, textContent("The shelf is clear."));
        return rpcResult(
          id,
          textContent(`One thing, oldest first (${count?.n ?? 1} held in total): ${row.body}\n(mark it: done:${row.id} · release:${row.id} · or ask again for the next)`),
        );
      }
      if (name === "correct_me") {
        const rule = String(args.rule ?? "").trim();
        if (!rule) return rpcResult(id, textContent("Empty correction."));
        const key = args.kind === "anti" ? "anti_rules" : "voice_rules";
        const now = Date.now();
        const prior = await env.DB.prepare("SELECT value FROM identity_fields WHERE key = ?")
          .bind(key)
          .first<{ value: string }>();
        const value = prior?.value ? `${prior.value}\n- ${rule}` : `- ${rule}`;
        await env.DB.prepare(
          "INSERT INTO identity_fields (key, value, source, updated_at) VALUES (?, ?, 'correction', ?) " +
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = 'correction', updated_at = excluded.updated_at",
        )
          .bind(key, value, now)
          .run();
        return rpcResult(id, textContent(`Correction stored as a standing ${key === "anti_rules" ? "never-rule" : "voice rule"}. It survives this conversation.`));
      }
      if (name === "remember") {
        const body = String(args.body ?? "").trim();
        if (!body) return rpcResult(id, textContent("Nothing to store."));
        const type = ["fact", "decision", "context", "preference"].includes(args.type)
          ? args.type
          : "fact";
        const now = Date.now();
        const mid = newId();
        // AI-carried content defaults trust_level='mixed' per loam doctrine, the
        // person said it, the model relayed it; the distinction stays visible.
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO substrate_entries (id, type, body, tags_json, created_at, updated_at, source, trust_level, sensitivity) VALUES (?, ?, ?, '[\"mcp\"]', ?, ?, 'mcp', 'mixed', 'personal')",
          ).bind(mid, type, body, now, now),
          env.DB.prepare("INSERT INTO entries_fts (body, entry_id, type) VALUES (?, ?, ?)").bind(body, mid, type),
        ]);
        return rpcResult(id, textContent(`Stored (${type}, provenance: mcp/mixed).`));
      }
      return rpcError(id, -32602, `Unknown tool: ${name}`);
    } catch (err) {
      return rpcError(id, -32603, `Tool failed: ${String(err).slice(0, 120)}`);
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}
