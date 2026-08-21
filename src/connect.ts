/**
 * connect, the harness walks you through installing itself into bigger AIs.
 * Born from the nine-hop walk of 2026-08-20: the person should never have to
 * compose a terminal command or hunt a settings pane; the worker hands them
 * everything pre-baked, one copy button per destination.
 * GET /connect, token typed client-side, never leaves the page except inside
 * the URLs it assembles for you.
 */
export function handleConnectPage(): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect your harness</title>
<style>
  :root { --pine:#1B3B2F; --paper:#F5F3EF; --birch:#F5E6C8; --moss:#4A773C; --amber:#C9A84C; --sage:#A9B0A6; --night:#1d2016; --bark:#5C4B3C; }
  body { background: var(--paper); color: var(--pine); font-family: Georgia, 'Times New Roman', serif; }
  h1, h2 { font-family: system-ui, sans-serif; letter-spacing: -0.01em; color: var(--pine); }
  button { background: var(--moss) !important; color: var(--birch) !important; border-radius: 8px; border: 0; cursor: pointer; font-family: system-ui, sans-serif; }
  button:hover { background: var(--pine) !important; }
  a { color: var(--moss); }
  input, textarea { background: #fff; border: 1px solid var(--sage) !important; color: var(--pine); }
  code, pre { background: #ece8df; color: var(--night); border-radius: 4px; }

  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 2rem auto; padding: 0 1rem; line-height: 1.55; color: #1F2937; }
  input { width: 100%; padding: .6rem; border: 1px solid #d1d5db; border-radius: 8px; font: inherit; box-sizing: border-box; }
  .dest { margin-top: 1.6rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 10px; }
  .dest h2 { margin: 0 0 .4rem; font-size: 1.05rem; }
  pre { background: #f3f4f6; padding: .7rem; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  button.copy { padding: .35rem .9rem; border: 0; border-radius: 6px; background: #1F2937; color: #fff; font: inherit; cursor: pointer; }
  .note { color: #6b7280; font-size: .9rem; }
</style></head>
<body>
  <h1>Put your harness inside a bigger AI</h1>
  <p>Your harness already talks on its own at <a href="/chat">/chat</a>. Connecting it to Claude or another
     AI is the upgrade, not the requirement. Type your pack token and everything below fills itself in.</p>
  <input id="tok" type="password" placeholder="your pack token" />
  <p class="note">The token stays on this page, it's only used to assemble your personal URLs below. Treat those URLs as secrets.</p>

  <div class="dest"><h2>Claude Code (terminal)</h2>
    <p class="note">One command, then restart Claude Code. Tools appear on the next session.</p>
    <pre id="cc">…</pre><button class="copy" data-t="cc">Copy</button></div>

  <div class="dest"><h2>Claude on the web or desktop</h2>
    <p class="note">Settings → Connectors → Add custom connector → paste:</p>
    <pre id="web">…</pre><button class="copy" data-t="web">Copy</button></div>

  <div class="dest"><h2>Anything else that speaks MCP</h2>
    <p class="note">Transport: HTTP. Same URL as above. Tools: get_identity, recall_memories, remember, correct_me, where_was_i, hold_this, whats_open, set_identity.</p></div>

  <p class="note">Hardening, when you're done testing: in Cloudflare, move DEMO_TOKEN from a variable to a Secret
     (same Settings page, one click), and if this URL ever ends up in a screenshot or a shared repo, rotate the
     token; the old URL dies instantly.</p>
  <script>
    const tok = document.getElementById('tok');
    function render() {
      const t = tok.value.trim() || '<your-token>';
      const url = location.origin + '/mcp/' + t;
      document.getElementById('cc').textContent = 'claude mcp add --transport http northwoods-pack ' + url;
      document.getElementById('web').textContent = url;
    }
    tok.addEventListener('input', render); render();
    document.querySelectorAll('button.copy').forEach(b => b.addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById(b.dataset.t).textContent);
      b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1200);
    }));
  </script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
