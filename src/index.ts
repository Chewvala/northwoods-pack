/**
 * northwoods-pack, modular monolith
 *
 * Single Worker housing 5 capability modules:
 *   /rhetoric/transform, output transformer (POST)
 *   /substrate/remember, store memory entry (POST)
 *   /substrate/recall, search memory (POST)
 *   /substrate/list, list by tag/type (GET)
 *   /resume/momentum, momentum-restart pivot (GET)
 *   /fleet/route. Workers AI router (POST)
 *   /mycelia/ask, opt-in help post (POST)
 *   /mycelia/open, opt-in help list (GET)
 *   /, pack info + module status (GET)
 *
 * This is the 1-click Deploy Button shape for v0.2.
 * The 5-Worker version (workers/northwoods-{rhetoric,substrate,resume,fleet,mycelia}/)
 * stays available as the "enterprise tier" for orgs that want per-Worker isolation.
 */

import {
  corsHeaders,
  json,
  unauthorized,
  notFound,
  Env,
} from "./common";
import { handleTransform } from "./rhetoric";
import {
  handleRemember,
  handleRecall,
  handleList,
  entryCount,
} from "./substrate";
import { handleMomentum } from "./resume";
import { handleRoute } from "./fleet";
import { handleAsk, handleOpen } from "./mycelia";
import { handleIdentityGet, handleIdentityPut } from "./identity";
import { handleIntakeForm, handleIntakeSubmit } from "./intake";
import { handleMcp } from "./mcp";
import { ensureSchema, tokenIsDefault, TOKEN_HELP } from "./setup";
import { handleChatPage, handleChatSend } from "./chat";
import { handleConnectPage } from "./connect";

function landing(h1: string, lede: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>northwoods-pack</title>
<style>
  :root { --pine:#1B3B2F; --paper:#F5F3EF; --birch:#F5E6C8; --moss:#4A773C; --amber:#C9A84C; --sage:#A9B0A6; }
  body{font-family:Georgia,serif;max-width:640px;margin:10dvh auto 0;padding:0 1rem 3rem;line-height:1.6;color:var(--pine);background:var(--paper)}
  h1{font-family:system-ui,sans-serif;letter-spacing:-.01em} h1::before{content:"🌲 "}
  button{padding:.7rem 1.5rem;border:0;border-radius:8px;background:var(--moss);color:var(--birch);font:1rem system-ui,sans-serif;cursor:pointer}
  button:hover{background:var(--pine)}
  .alt{color:var(--sage);font-size:.92rem}code{background:#ece8df;padding:.1rem .3rem;border-radius:4px}
  .doors{display:flex;gap:1rem;flex-wrap:wrap;margin-top:1rem}
  .door{flex:1;min-width:240px;border:1px solid var(--sage);border-radius:10px;padding:1rem}
  .door h2{font-family:system-ui,sans-serif;font-size:1.02rem;margin:0 0 .4rem}
  .promise{border-left:3px solid var(--amber);padding:.2rem 0 .2rem .9rem;margin-top:1.4rem;font-style:italic}
</style></head>
<body><h1>${h1}</h1><p>${lede}</p>${body}</body></html>`;
}

async function info(env: Env): Promise<Response> {
  const needsToken = tokenIsDefault(env);
  let count = 0;
  try {
    count = await entryCount(env);
  } catch {
    /* DB may not be migrated yet */
  }
  return json({
    pack: "northwoods-pack",
    setup: needsToken ? { needed: true, how: TOKEN_HELP } : { needed: false },
    version: "0.5.0",
    purpose:
      "Public PAI v0.3. 1 Worker, 1-click install: identity + intake interview + MCP, so your AI knows you in ten minutes.",
    modules: {
      rhetoric: { paths: ["POST /rhetoric/transform"] },
      substrate: {
        paths: [
          "POST /substrate/remember",
          "POST /substrate/recall",
          "GET /substrate/list?tag=X&type=Y",
        ],
        entries_count: count,
      },
      resume: { paths: ["GET /resume/momentum"] },
      fleet: { paths: ["POST /fleet/route"] },
      mycelia: {
        paths: ["POST /mycelia/ask", "GET /mycelia/open"],
        opt_in_header: "X-Mycelia-Opt-In: true (required per request)",
      },
      identity: { paths: ["GET /identity", "PUT /identity"] },
      intake: { paths: ["GET /intake (the interview)", "POST /intake"] },
      mcp: {
        paths: ["POST /mcp/:token. MCP server (get_identity, recall_memories, remember, correct_me)"],
        felt_win: "paste your MCP URL into Claude or any MCP client; your AI knows you",
      },
    },
    doctrine: {
      audience_is_strong: "no user attributes named to the AI",
      substrate_is_product: "your data on your CF account",
      same_surface: "what helps one helps any",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // The human front door: routes by state. Machines get JSON at /api.
    if (method === "GET" && (path === "/" || path === "")) {
      if (tokenIsDefault(env)) {
        return new Response(landing(
          "One step left before this is yours",
          "The pack ships locked with a factory token, otherwise every install would share one public key. In your Cloudflare dashboard open this Worker → <b>Settings → Variables and Secrets</b>, replace <code>DEMO_TOKEN</code> with a long random string of your own, and reload this page.",
          ""), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      await ensureSchema(env);
      return new Response(landing(
        "Your harness is alive",
        "It runs on your account, keeps everything in your database, and talks with its own built-in AI. Nothing here belongs to anyone but you.",
        `<div class="doors">
           <div class="door"><h2>I'm new, no AI setup, no terminal</h2>
             <p>Then just talk. The first conversation is the introduction: it asks, you answer, nothing to fill out, nothing else to install.</p>
             <p><a href="/chat"><button>Talk to it</button></a></p></div>
           <div class="door"><h2>I already run a harness</h2>
             <p>PAI, Claude Code, anything that speaks MCP, this becomes its sovereign identity and memory layer. Copy-ready install, your URL baked in.</p>
             <p><a href="/connect"><button>Connect it</button></a></p></div>
         </div>
         <p class="promise">A promise, for the person who almost closed this tab: you will not need a terminal, an install, or anyone's permission. One button got you here; from here you just talk. If you get stuck anywhere, that is my failure, not yours.</p>
         <p class="alt">Prefer forms? The <a href="/intake">five-question intake</a> still exists.
         Lost your token? You own this, set a new one in your Cloudflare dashboard (Worker → Settings → Variables and Secrets); your memories stay.
         And everything here is yours to take: <code>/export</code> hands you the whole pot as one file.</p>`),
        { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (method === "GET" && path === "/api") {
      return info(env);
    }
    // The door out: everything, as JSONL, gated by the token. Sovereignty that
    // can't leave isn't sovereignty. (Council catch, 2026-08-20.)
    if (method === "GET" && path === "/export") {
      const t = url.searchParams.get("token") || request.headers.get("X-Pack-Token") || "";
      if (!t || t !== env.DEMO_TOKEN) return unauthorized();
      await ensureSchema(env);
      const idn = await env.DB.prepare("SELECT key, value, source, updated_at FROM identity_fields").all();
      const mem = await env.DB.prepare("SELECT * FROM substrate_entries ORDER BY created_at").all();
      const lps = await env.DB.prepare("SELECT * FROM loops ORDER BY created_at").all();
      const lines: string[] = [];
      for (const r of idn.results ?? []) lines.push(JSON.stringify({ record: "identity", ...r }));
      for (const r of mem.results ?? []) lines.push(JSON.stringify({ record: "memory", ...r }));
      for (const r of lps.results ?? []) lines.push(JSON.stringify({ record: "loop", ...r }));
      return new Response(lines.join("\n") + "\n", {
        headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": 'attachment; filename="my-harness-export.jsonl"' },
      });
    }
    if (method === "GET" && path === "/connect") {
      if (tokenIsDefault(env)) return json({ error: TOKEN_HELP }, 503);
      return handleConnectPage();
    }
    if (method === "GET" && path === "/chat") {
      if (tokenIsDefault(env)) return json({ error: TOKEN_HELP }, 503);
      await ensureSchema(env);
      return handleChatPage();
    }
    if (method === "POST" && path === "/chat/send") {
      if (tokenIsDefault(env)) return json({ error: TOKEN_HELP }, 503);
      await ensureSchema(env);
      return await handleChatSend(request, env);
    }
    // Intake interview: the form is public to render; the submit checks the
    // token in its body. MCP checks the token in its path. Both self-auth so
    // chat clients and browsers that can't set headers still work.
    if (method === "GET" && path === "/intake") {
      if (tokenIsDefault(env)) return json({ setup_needed: TOKEN_HELP }, 503);
      await ensureSchema(env);
      return handleIntakeForm();
    }
    if (method === "POST" && path === "/intake") {
      if (tokenIsDefault(env)) return json({ error: TOKEN_HELP }, 503);
      await ensureSchema(env);
      return await handleIntakeSubmit(request, env);
    }
    if (path.startsWith("/mcp/")) {
      if (tokenIsDefault(env)) return json({ error: TOKEN_HELP }, 503);
      await ensureSchema(env);
      return await handleMcp(request, env, path.slice("/mcp/".length));
    }

    // Auth check for everything else
    const token = request.headers.get("X-Pack-Token");
    if (!token || token !== env.DEMO_TOKEN) {
      return unauthorized();
    }

    try {
      // --- identity ---
      if (method === "GET" && path === "/identity") {
        return await handleIdentityGet(env);
      }
      if (method === "PUT" && path === "/identity") {
        return await handleIdentityPut(request, env);
      }
      // --- rhetoric ---
      if (method === "POST" && path === "/rhetoric/transform") {
        return await handleTransform(request, env);
      }
      // --- substrate ---
      if (method === "POST" && path === "/substrate/remember") {
        return await handleRemember(request, env);
      }
      if (method === "POST" && path === "/substrate/recall") {
        return await handleRecall(request, env);
      }
      if (method === "GET" && path === "/substrate/list") {
        return await handleList(url, env);
      }
      // --- resume ---
      if (method === "GET" && path === "/resume/momentum") {
        return await handleMomentum(env);
      }
      // --- fleet ---
      if (method === "POST" && path === "/fleet/route") {
        return await handleRoute(request, env);
      }
      // --- mycelia ---
      if (method === "POST" && path === "/mycelia/ask") {
        return await handleAsk(request, env);
      }
      if (method === "GET" && path === "/mycelia/open") {
        return await handleOpen(request, env);
      }
    } catch (err) {
      return json({ error: "Internal error", detail: String(err) }, 500);
    }

    return notFound(path);
  },
};
