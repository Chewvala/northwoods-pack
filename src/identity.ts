/**
 * identity, the Layer-3 store: who you are, your decision principles, and how
 * an AI should speak to you. The seed of every voice-fit journey ("tailor how
 * you respond to me") graduated into an architectural layer.
 *
 * Every field carries provenance (source: interview | api). The assembled doc
 * is what an AI reads FIRST, before memories, so the person arrives as a
 * person, not as a search result.
 */
import { Env, json, invalidJson } from "./common";

export const IDENTITY_KEYS = [
  "call_me",            // what to call you
  "who_i_am",           // your own words, a few sentences
  "current_focus",      // what you're building / chasing right now
  "voice_rules",        // how an AI should speak to you
  "anti_rules",         // what an AI must never do with you
  "contract",           // standing operating rules any AI reading this must obey
] as const;

export async function getIdentityDoc(env: Env): Promise<string | null> {
  const rows = await env.DB.prepare(
    "SELECT key, value FROM identity_fields",
  ).all<{ key: string; value: string }>();
  if (!rows.results || rows.results.length === 0) return null;
  const map = new Map(rows.results.map((r) => [r.key, r.value]));
  const parts: string[] = [];
  if (map.get("call_me")) parts.push(`# ${map.get("call_me")}`);
  if (map.get("who_i_am")) parts.push(`## Who I am\n${map.get("who_i_am")}`);
  if (map.get("current_focus"))
    parts.push(`## What I'm working toward\n${map.get("current_focus")}`);
  if (map.get("voice_rules"))
    parts.push(`## How to speak to me\n${map.get("voice_rules")}`);
  if (map.get("anti_rules"))
    parts.push(`## Never do this with me\n${map.get("anti_rules")}`);
  // The Contract: standing operating rules every AI reading this identity is
  // asked to obey. The cohort defaults, one thing at a time, no menus, no
  // clocks, no absence-guilt, are the accessibility layer, stated as conduct
  // rather than as anything about the person. Editable like any identity field.
  parts.push(map.get("contract") ?? [
    "## Operating contract for any AI reading this",
    "- One thing at a time. Never present a menu of options when one next step will do.",
    "- Never name the time of day, how long it has been, or what \"should\" have happened by now. Absence carries no debt.",
    "- A correction is an instruction, not a conflict. Store it (correct_me) and move on.",
    "- When they say they have to stop, hold the thread (hold_this) and make stopping safe.",
    "- Plain prose over bullet walls. Short over long. Their words over your paraphrase.",
  ].join("\n"));
  return parts.join("\n\n");
}

export async function handleIdentityGet(env: Env): Promise<Response> {
  const doc = await getIdentityDoc(env);
  if (doc === null)
    return json(
      { identity: null, note: "Empty, run the intake interview at GET /intake" },
      200,
    );
  return json({ identity: doc });
}

export async function handleIdentityPut(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { key?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }
  if (!body.key || typeof body.value !== "string")
    return json({ error: "key and value required" }, 400);
  if (!(IDENTITY_KEYS as readonly string[]).includes(body.key))
    return json({ error: `key must be one of: ${IDENTITY_KEYS.join(", ")}` }, 400);
  await env.DB.prepare(
    "INSERT INTO identity_fields (key, value, source, updated_at) VALUES (?, ?, 'api', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = 'api', updated_at = excluded.updated_at",
  )
    .bind(body.key, body.value, Date.now())
    .run();
  return json({ ok: true, key: body.key });
}
