/**
 * Fleet module, model router via Workers AI.
 *
 * Routes the task through the right backend based on a hint.
 * US-residency models preferred (per substrate-sovereignty doctrine).
 */

import { json, Env } from "./common";

interface RouteRequest {
  task: string;
  hint?: "research" | "reflect" | "code" | "factcheck" | "translate";
  max_tokens?: number;
}

interface RouteDecision {
  model: string;
  reason: string;
}

function chooseModel(hint?: string): RouteDecision {
  switch (hint) {
    case "code":
      return {
        model: "@cf/meta/llama-4-scout-17b-16e-instruct",
        reason: "Llama 4 Scout. US residency, strong code reasoning",
      };
    case "translate":
      return {
        model: "@cf/mistralai/mistral-small-3.1-24b-instruct",
        reason: "Mistral Small 3.1, multilingual specialty",
      };
    case "reflect":
      return {
        model: "@cf/google/gemma-3-12b-it",
        reason: "Gemma 3, measured, reflective register",
      };
    case "research":
    case "factcheck":
      return {
        model: "@cf/meta/llama-4-scout-17b-16e-instruct",
        reason: `${hint} stubbed to Llama 4 Scout in v0.2, v0.3 routes to external Perplexity`,
      };
    default:
      return {
        model: "@cf/meta/llama-4-scout-17b-16e-instruct",
        reason: "Default. Llama 4 Scout (US residency)",
      };
  }
}

export async function handleRoute(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: RouteRequest;
  try {
    body = (await request.json()) as RouteRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (typeof body.task !== "string" || body.task.length === 0) {
    return json({ error: "Missing or invalid 'task' field" }, 400);
  }

  const decision = chooseModel(body.hint);
  const maxTokens = Math.min(Math.max(64, body.max_tokens ?? 512), 2048);

  try {
    const result = (await env.AI.run(decision.model as keyof AiModels, {
      messages: [{ role: "user", content: body.task }],
      max_tokens: maxTokens,
    } as never)) as { response?: string };

    return json({
      response: result?.response ?? "",
      model_used: decision.model,
      route_reason: decision.reason,
      hint_received: body.hint ?? "(none)",
    });
  } catch (err) {
    return json(
      {
        error: "Model inference failed",
        model_attempted: decision.model,
        detail: String(err),
      },
      500,
    );
  }
}
