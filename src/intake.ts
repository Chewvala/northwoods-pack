/**
 * intake, the first-run interview. Fixes the empty-pot problem at the door:
 * a deployed pack should learn its person in the first ten minutes, not ship
 * blank and hope they read API docs.
 *
 * GET  /intake, the interview form (public: it renders; submitting needs the token)
 * POST /intake, token-checked in the body; seeds identity_fields + substrate seeds
 *
 * The questions are the distilled first-month needs of the operator arc this
 * pack generalizes: name, who-I-am, current focus, voice rules, anti-rules,
 * and a handful of things worth remembering, nothing clinical, nothing that
 * reads like a chart. The person describes themself in their own words.
 */
import { Env, json, invalidJson, newId } from "./common";

const QUESTIONS: Array<{ key: string; label: string; hint: string; rows: number }> = [
  { key: "call_me", label: "What should your AI call you?", hint: "A name, a handle, whatever feels right.", rows: 1 },
  { key: "who_i_am", label: "Who are you, in your own words?", hint: "A few sentences. Not a resume, how you'd tell a new friend.", rows: 4 },
  { key: "current_focus", label: "What are you building or chasing right now?", hint: "The thing you'd want your AI to hold steady across every conversation.", rows: 3 },
  { key: "voice_rules", label: "How should an AI speak to you?", hint: "Direct? Short? No pep talks? Explain like a colleague? Your rules.", rows: 3 },
  { key: "anti_rules", label: "What should an AI never do with you?", hint: "The stuff that makes you close the tab. Cheerleading, hedging, lectures, name it.", rows: 3 },
];

export function handleIntakeForm(): Response {
  const fields = QUESTIONS.map(
    (q) => `
      <label for="${q.key}">${q.label}</label>
      <p class="hint">${q.hint}</p>
      ${q.rows === 1
        ? `<input id="${q.key}" name="${q.key}" type="text" />`
        : `<textarea id="${q.key}" name="${q.key}" rows="${q.rows}"></textarea>`}
    `,
  ).join("\n");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your harness wants to meet you</title>
<style>
  :root { --pine:#1B3B2F; --paper:#F5F3EF; --birch:#F5E6C8; --moss:#4A773C; --amber:#C9A84C; --sage:#A9B0A6; --night:#1d2016; --bark:#5C4B3C; }
  body { background: var(--paper); color: var(--pine); font-family: Georgia, 'Times New Roman', serif; }
  h1, h2 { font-family: system-ui, sans-serif; letter-spacing: -0.01em; color: var(--pine); }
  button { background: var(--moss) !important; color: var(--birch) !important; border-radius: 8px; border: 0; cursor: pointer; font-family: system-ui, sans-serif; }
  button:hover { background: var(--pine) !important; }
  a { color: var(--moss); }
  input, textarea { background: #fff; border: 1px solid var(--sage) !important; color: var(--pine); }
  code, pre { background: #ece8df; color: var(--night); border-radius: 4px; }

  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1F2937; }
  label { font-weight: 600; display: block; margin-top: 1.5rem; }
  .hint { margin: 0.15rem 0 0.4rem; color: #6b7280; font-size: 0.9rem; }
  input, textarea { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font: inherit; }
  button { margin-top: 1.5rem; padding: 0.6rem 1.4rem; border: 0; border-radius: 6px; background: #1F2937; color: white; font: inherit; cursor: pointer; }
  #result { margin-top: 1.5rem; padding: 1rem; border-radius: 6px; background: #f3f4f6; white-space: pre-wrap; display: none; }
  .memories-note { margin-top: 1.5rem; }
</style></head>
<body>
  <h1>Your harness wants to meet you</h1>
  <p><strong>Prefer talking to typing?</strong> Skip this form: paste
     <code id="mcpurl">(type your token below to see your MCP URL)</code> into Claude or any MCP client,
     and your AI will interview you instead, one question at a time, drafts you approve, no blank boxes. It can also read who you are from things you show it: a photo of your bookshelf or desk, a page you wrote yourself before AI existed in your life. Evidence beats description.</p>
  <p>Or, five questions in your own words. Rough one-liners are fine, day-one identity is a draft,
     and corrections stick later. On your account, in your database, changeable any time.</p>
  <form id="f">
    <label for="token">Your pack token</label>
    <p class="hint">The DEMO_TOKEN secret you set at deploy. Proves this pot is yours.</p>
    <input id="token" name="token" type="password" />
    ${fields}
    <label for="seed_memories" class="memories-note">Anything your AI should already remember?</label>
    <p class="hint">One per line. People, projects, context, the stuff you're tired of re-explaining.</p>
    <textarea id="seed_memories" name="seed_memories" rows="4"></textarea>
    <button type="submit">Seed my harness</button>
  </form>
  <div id="result"></div>
  <script>
    document.getElementById('token').addEventListener('input', (e) => {
      const t = e.target.value.trim();
      document.getElementById('mcpurl').textContent = t ? (location.origin + '/mcp/' + t) : '(type your token below to see your MCP URL)';
    });
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const r = await fetch('/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await r.json();
      const el = document.getElementById('result');
      el.style.display = 'block';
      el.textContent = r.ok
        ? 'Done. Your AI can meet you now.\\n\\nMCP URL (paste into Claude or any MCP client):\\n' + out.mcp_url + '\\n\\nIt serves four tools: get_identity, recall_memories, remember, correct_me.'
        : 'Error: ' + (out.error || r.status);
    });
  </script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function handleIntakeSubmit(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  if (!body.token || body.token !== env.DEMO_TOKEN)
    return json({ error: "Bad token, use the DEMO_TOKEN you set at deploy" }, 401);

  const now = Date.now();
  const stmts = [];
  for (const q of QUESTIONS) {
    const v = (body[q.key] || "").trim();
    if (!v) continue;
    stmts.push(
      env.DB.prepare(
        "INSERT INTO identity_fields (key, value, source, updated_at) VALUES (?, ?, 'interview', ?) " +
          "ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = 'interview', updated_at = excluded.updated_at",
      ).bind(q.key, v, now),
    );
  }
  const seeds = (body.seed_memories || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  for (const s of seeds) {
    const sid = newId();
    stmts.push(
      env.DB.prepare(
        "INSERT INTO substrate_entries (id, type, body, tags_json, created_at, updated_at, source, trust_level, sensitivity) VALUES (?, 'seed', ?, '[\"intake\"]', ?, ?, 'intake', 'trusted', 'personal')",
      ).bind(sid, s, now, now),
    );
    stmts.push(
      env.DB.prepare("INSERT INTO entries_fts (body, entry_id, type) VALUES (?, ?, 'seed')").bind(s, sid),
    );
  }
  if (stmts.length === 0) return json({ error: "Nothing to seed" }, 400);
  await env.DB.batch(stmts);

  const origin = new URL(request.url).origin;
  return json({
    ok: true,
    seeded: { identity_fields: stmts.length - seeds.length * 2, memories: seeds.length },
    mcp_url: `${origin}/mcp/${env.DEMO_TOKEN}`,
    next: "Paste the MCP URL into Claude (Settings → Connectors) or any MCP client. Your AI reads get_identity first.",
  });
}
