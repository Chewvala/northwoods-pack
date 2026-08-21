/**
 * Mycelia module, opt-in cross-fleet help channel.
 *
 * OFF BY DEFAULT. Caller must send X-Mycelia-Opt-In: true on every request.
 * v0.2 is a structural stub: endpoints exist, contract enforced, no cross-fleet wiring yet.
 */

import { json, Env } from "./common";

interface AskRequest {
  question: string;
  context?: string;
}

function requireOptIn(request: Request): Response | null {
  const optIn = request.headers.get("X-Mycelia-Opt-In");
  if (optIn !== "true") {
    return json(
      {
        error: "Opt-in required",
        note:
          "Mycelia is off by default. Send header 'X-Mycelia-Opt-In: true' with each request. v0.3 may add persistent opt-in.",
      },
      403,
    );
  }
  return null;
}

export async function handleAsk(
  request: Request,
  _env: Env,
): Promise<Response> {
  const opt = requireOptIn(request);
  if (opt) return opt;

  let body: AskRequest;
  try {
    body = (await request.json()) as AskRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (typeof body.question !== "string" || body.question.length === 0) {
    return json({ error: "Missing or invalid 'question' field" }, 400);
  }

  return json({
    acknowledged: true,
    note:
      "v0.2 stub, your question was received but the cross-fleet wiring isn't built yet. Coming in v0.3.",
    received: { question: body.question, context: body.context ?? null },
  });
}

export async function handleOpen(
  request: Request,
  _env: Env,
): Promise<Response> {
  const opt = requireOptIn(request);
  if (opt) return opt;

  return json({
    open: [],
    note: "v0.2 stub, no cross-fleet wiring yet, so always empty.",
  });
}
