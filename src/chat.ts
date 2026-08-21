/**
 * chat, the hand in the glove. The pack stops assuming you own a second AI:
 * this page talks, on YOUR Workers AI allocation, with your identity read
 * first and your memories in reach. On an empty pot it conducts the intake
 * itself, one question at a time, drafts you approve, evidence over
 * description. Born 2026-08-20 from the first stranger walk: "we still
 * haven't gotten to an AI yet."
 *
 * GET  /chat, the page (token gate client-side; sends token per request)
 * POST /chat/send, { token, messages:[{role,content}...] } → { reply }
 *
 * Identity writes from the interview use a deterministic marker the worker
 * parses out of the model's reply: [[SAVE:key=...]] / [[REMEMBER:...]], * stored server-side, stripped from the shown text. No client tooling needed.
 */
import { Env, json, invalidJson, newId } from "./common";
import { getIdentityDoc } from "./identity";

const MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

const INTERVIEWER = `The pot is empty, so this conversation IS the intake. Interview the person gently, ONE question at a time, in this order: what to call them (call_me); who they are, let them ramble and offer to draft it from the ramble (who_i_am); what they're building or chasing (current_focus); how an AI should speak to them, offer concrete options to react to (voice_rules); what an AI must never do with them, offer examples like cheerleading, hedging, lectures, time pressure (anti_rules). Also invite them to SHOW you things (a bookshelf, a desk) and to paste writing they made without AI, draft who_i_am from evidence, not interrogation. After they approve a field's wording, emit it on its own line exactly as: [[SAVE:key=approved text]], the harness stores it and strips the marker. For other things worth keeping, emit [[REMEMBER:the memory]]. Never emit a marker for wording they have not approved. One question per turn. No bullet walls. No pep talks.`;

function systemPrompt(identity: string | null, recalled: string): string {
  const parts: string[] = [
    "You are this person's harness, their own AI, running on their own account. Plain prose. One thing at a time. Never present option-menus unless offering examples to react to. Never mention how long since they last spoke. A correction is an instruction: obey it and, if durable, emit [[REMEMBER:...]] or [[SAVE:voice_rules=...]] per the marker rules.",
  ];
  if (identity) parts.push("WHO YOU ARE TALKING TO (read carefully, obey the contract):\n" + identity);
  else parts.push(INTERVIEWER);
  if (recalled) parts.push("POSSIBLY RELEVANT MEMORIES (use silently; cite only if useful):\n" + recalled);
  return parts.join("\n\n");
}

async function recallFor(env: Env, text: string): Promise<string> {
  const terms = text.toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length >= 4).slice(0, 6);
  if (!terms.length) return "";
  try {
    const q = terms.map((t) => `"${t}"`).join(" OR ");
    const rows = await env.DB.prepare(
      `SELECT e.type, e.body FROM entries_fts f JOIN substrate_entries e ON e.id = f.entry_id
       WHERE entries_fts MATCH ? AND e.sensitivity != 'secret' ORDER BY e.created_at DESC LIMIT 6`,
    ).bind(q).all<{ type: string; body: string }>();
    return (rows.results ?? []).map((r) => `- [${r.type}] ${r.body}`).join("\n");
  } catch { return ""; }
}

// Parse and persist [[SAVE:key=...]] / [[REMEMBER:...]] markers; return cleaned text.
export async function absorbMarkers(env: Env, reply: string): Promise<string> {
  const VALID = ["call_me", "who_i_am", "current_focus", "voice_rules", "anti_rules", "contract"];
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];
  let clean = reply;
  for (const m of reply.matchAll(/\[\[SAVE:([a-z_]+)=([\s\S]*?)\]\]/g)) {
    if (VALID.includes(m[1]) && m[2].trim()) {
      stmts.push(env.DB.prepare(
        "INSERT INTO identity_fields (key, value, source, updated_at) VALUES (?, ?, 'chat-interview', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = 'chat-interview', updated_at = excluded.updated_at",
      ).bind(m[1], m[2].trim(), now));
    }
    clean = clean.replace(m[0], "");
  }
  for (const m of reply.matchAll(/\[\[REMEMBER:([\s\S]*?)\]\]/g)) {
    if (m[1].trim()) {
      const id = newId();
      stmts.push(env.DB.prepare(
        "INSERT INTO substrate_entries (id, type, body, tags_json, created_at, updated_at, source, trust_level, sensitivity) VALUES (?, 'context', ?, '[\"chat\"]', ?, ?, 'chat', 'mixed', 'personal')",
      ).bind(id, m[1].trim(), now, now));
      stmts.push(env.DB.prepare("INSERT INTO entries_fts (body, entry_id, type) VALUES (?, ?, 'context')").bind(m[1].trim(), id));
    }
    clean = clean.replace(m[0], "");
  }
  if (stmts.length) await env.DB.batch(stmts);
  return clean.replace(/\n{3,}/g, "\n\n").trim();
}

export async function handleChatSend(request: Request, env: Env): Promise<Response> {
  let body: { token?: string; messages?: { role: string; content: string }[] };
  try { body = await request.json(); } catch { return invalidJson(); }
  if (!body.token || body.token !== env.DEMO_TOKEN) return json({ error: "Bad token" }, 401);
  const messages = (body.messages ?? []).slice(-16).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  );
  if (!messages.length) return json({ error: "No messages" }, 400);

  const identity = await getIdentityDoc(env);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const recalled = identity ? await recallFor(env, lastUser) : "";
  const sys = systemPrompt(identity, recalled);

  const ai: any = await env.AI.run(MODEL as any, {
    messages: [{ role: "system", content: sys }, ...messages],
    max_tokens: 800,
  } as any);
  const raw: string = ai?.response ?? ai?.choices?.[0]?.message?.content ?? "";
  if (!raw) return json({ error: "The model returned nothing. Workers AI may be at its daily free allocation." }, 502);
  const reply = await absorbMarkers(env, raw);
  return json({ reply });
}

export function handleChatPage(): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your harness</title>
<style>
  :root { --pine:#1B3B2F; --paper:#F5F3EF; --birch:#F5E6C8; --moss:#4A773C; --amber:#C9A84C; --sage:#A9B0A6; --night:#1d2016; --bark:#5C4B3C; }
  body { background: var(--paper); color: var(--pine); font-family: Georgia, 'Times New Roman', serif; }
  h1, h2 { font-family: system-ui, sans-serif; letter-spacing: -0.01em; color: var(--pine); }
  button { background: var(--moss) !important; color: var(--birch) !important; border-radius: 8px; border: 0; cursor: pointer; font-family: system-ui, sans-serif; }
  button:hover { background: var(--pine) !important; }
  a { color: var(--moss); }
  input, textarea { background: #fff; border: 1px solid var(--sage) !important; color: var(--pine); }
  code, pre { background: #ece8df; color: var(--night); border-radius: 4px; }

  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 0 auto; padding: 1rem; color: #1F2937; display: flex; flex-direction: column; height: 100dvh; box-sizing: border-box; }
  #log { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
  .msg { margin: 0.6rem 0; line-height: 1.5; white-space: pre-wrap; }
  .me { color: #6b7280; }
  .harness { color: #111827; }
  form { display: flex; gap: 0.5rem; padding-bottom: env(safe-area-inset-bottom); }
  input[type=text], input[type=password] { flex: 1; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; }
  button { padding: 0.6rem 1.1rem; border: 0; border-radius: 8px; background: #1F2937; color: white; font: inherit; cursor: pointer; }
  #gate { margin-top: 30dvh; text-align: center; }
</style></head>
<body>
  <div id="gate">
    <p>Your pack token unlocks the conversation.</p>
    <form id="gf"><input id="tok" type="password" placeholder="pack token" /><button>Enter</button></form>
  </div>
  <div id="log" hidden></div>
  <form id="cf" hidden><input id="box" type="text" autocomplete="off" placeholder="say something" /><button>Send</button></form>
  <p id="foot" hidden style="font-size:.78rem;color:#A9B0A6;margin:.3rem 0 0">Your harness carries load; it is not a therapist or a doctor. In crisis, reach a human: 988 (US) or your local line.</p>
  <script>
    const msgs = [];
    const log = document.getElementById('log');
    let TOKEN = sessionStorage.getItem('pack_token') || '';
    function show(role, text) {
      const d = document.createElement('div');
      d.className = 'msg ' + (role === 'user' ? 'me' : 'harness');
      d.textContent = (role === 'user' ? 'you: ' : '') + text;
      log.appendChild(d); log.scrollTop = log.scrollHeight;
    }
    function enter() {
      document.getElementById('gate').hidden = true;
      log.hidden = false; document.getElementById('cf').hidden = false; document.getElementById('foot').hidden = false;
      if (!msgs.length) { send('hello'); }
    }
    async function send(text) {
      msgs.push({ role: 'user', content: text });
      if (text !== 'hello' || msgs.length > 1) show('user', text);
      const r = await fetch('/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: TOKEN, messages: msgs }) });
      const out = await r.json();
      if (!r.ok) { show('assistant', 'Error: ' + (out.error || r.status)); msgs.pop(); return; }
      msgs.push({ role: 'assistant', content: out.reply });
      show('assistant', out.reply);
    }
    document.getElementById('gf').addEventListener('submit', (e) => {
      e.preventDefault();
      TOKEN = document.getElementById('tok').value.trim();
      if (TOKEN) { sessionStorage.setItem('pack_token', TOKEN); enter(); }
    });
    document.getElementById('cf').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = document.getElementById('box').value.trim();
      if (t) { document.getElementById('box').value = ''; send(t); }
    });
    if (TOKEN) enter();
  </script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
