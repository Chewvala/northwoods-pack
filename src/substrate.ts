/**
 * Substrate module, persistent memory store backed by D1 + KV.
 *
 * Exports getLatestEntry() for the resume module to call directly
 * (no more service-binding round-trip).
 */

import { json, newId, Env } from "./common";

interface RememberRequest {
  type: string;
  body: string;
  tags?: string[];
}

interface RecallRequest {
  query?: string;
  tags?: string[];
  type?: string;
  limit?: number;
}

export interface SubstrateEntry {
  id: string;
  type: string;
  body: string;
  tags: string[];
  created_at: number;
  updated_at: number;
}

function rowToEntry(row: Record<string, unknown>): SubstrateEntry {
  let tags: string[] = [];
  try {
    tags = JSON.parse(String(row.tags_json ?? "[]"));
  } catch {
    /* leave empty */
  }
  return {
    id: String(row.id),
    type: String(row.type),
    body: String(row.body),
    tags,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export async function handleRemember(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: RememberRequest;
  try {
    body = (await request.json()) as RememberRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (typeof body.type !== "string" || body.type.length === 0) {
    return json({ error: "Missing or invalid 'type' field" }, 400);
  }
  if (typeof body.body !== "string" || body.body.length === 0) {
    return json({ error: "Missing or invalid 'body' field" }, 400);
  }
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string")
    : [];

  const id = newId();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO substrate_entries (id, type, body, tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, body.type, body.body, JSON.stringify(tags), now, now)
    .run();

  return json({ id, created_at: now });
}

export async function handleRecall(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: RecallRequest;
  try {
    body = (await request.json()) as RecallRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const limit = Math.min(Math.max(1, body.limit ?? 20), 100);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (body.type && typeof body.type === "string") {
    conditions.push("type = ?");
    params.push(body.type);
  }
  if (body.query && typeof body.query === "string" && body.query.length > 0) {
    conditions.push("body LIKE ?");
    params.push(`%${body.query}%`);
  }
  if (Array.isArray(body.tags) && body.tags.length > 0) {
    for (const tag of body.tags) {
      if (typeof tag === "string" && tag.length > 0) {
        conditions.push("tags_json LIKE ?");
        params.push(`%"${tag}"%`);
      }
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, type, body, tags_json, created_at, updated_at
               FROM substrate_entries
               ${where}
               ORDER BY created_at DESC
               LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  const entries = (result.results ?? []).map(rowToEntry);
  return json({ entries, count: entries.length });
}

export async function handleList(url: URL, env: Env): Promise<Response> {
  const tag = url.searchParams.get("tag");
  const type = url.searchParams.get("type");
  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20),
    100,
  );

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (tag) {
    conditions.push("tags_json LIKE ?");
    params.push(`%"${tag}"%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, type, body, tags_json, created_at, updated_at
               FROM substrate_entries
               ${where}
               ORDER BY created_at DESC
               LIMIT ?`;
  params.push(limit);

  const result = await env.DB.prepare(sql).bind(...params).all();
  const entries = (result.results ?? []).map(rowToEntry);
  return json({ entries, count: entries.length });
}

/**
 * Internal function, called by resume module directly. No HTTP round-trip.
 */
export async function getLatestEntry(env: Env): Promise<SubstrateEntry | null> {
  const result = await env.DB.prepare(
    `SELECT id, type, body, tags_json, created_at, updated_at
     FROM substrate_entries
     ORDER BY created_at DESC
     LIMIT 1`,
  ).first<Record<string, unknown>>();
  return result ? rowToEntry(result) : null;
}

export async function entryCount(env: Env): Promise<number> {
  const r = await env.DB.prepare(
    "SELECT COUNT(*) as n FROM substrate_entries",
  ).first<{ n: number }>();
  return r?.n ?? 0;
}
