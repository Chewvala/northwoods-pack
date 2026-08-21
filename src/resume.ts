/**
 * Resume module, momentum-restart, NOT audit.
 *
 * Returns ONE forward-leaning sentence answering "where was I."
 * Never timestamps. Never task lists. Never verdicts about absence.
 *
 * Calls substrate's getLatestEntry() directly, no service binding needed
 * since everything's in the same Worker.
 */

import { json, Env } from "./common";
import { getLatestEntry, SubstrateEntry } from "./substrate";

function craftPivot(entry: SubstrateEntry | null): string {
  if (!entry) {
    return "Nothing's queued up, start with what's on your mind right now.";
  }
  const snippet =
    entry.body.length > 140
      ? entry.body.slice(0, 137).trimEnd() + "..."
      : entry.body;

  switch (entry.type) {
    case "breadcrumb":
      return `Pick up the thread: ${snippet}`;
    case "decision":
      return `You decided: ${snippet}, what's the next move on that?`;
    case "note":
      return `Last note worth holding: ${snippet}`;
    case "question":
      return `Open question on your mind: ${snippet}`;
    case "session":
      return `Where you left the work: ${snippet}`;
    default:
      return `Live thread: ${snippet}`;
  }
}

export async function handleMomentum(env: Env): Promise<Response> {
  const entry = await getLatestEntry(env);
  return json({ pivot: craftPivot(entry) });
}
