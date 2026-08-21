---
name: NorthwoodsFleet
description: "Model router via Workers AI — picks the right backend model for the task and calls it. Default Llama 4 Scout (US residency). Route hints select Mistral / Gemma for translate / reflect. USE WHEN research-heavy query, want a second opinion, need code reasoning from a different model, fact-check, translate, reflective question. NOT FOR fast conversational replies (use default Claude)."
version: 0.2.0
effort: minimal
---

## Customization

`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsFleet/`

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Routing through the fleet"}' \
  > /dev/null 2>&1 &
```

# NorthwoodsFleet — Model Router

Calls the deployed Northwoods Pack Worker to route a query through the right Workers AI model based on hint.

## Workflow

1. Read `pack.url` and `auth.token` from `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsPack/CONFIG.md`.
2. `POST {pack.url}/fleet/route` with `X-Pack-Token: {auth.token}` and a JSON body.

## Request

```bash
curl -s -X POST "$PACK_URL/fleet/route" \
  -H "Content-Type: application/json" \
  -H "X-Pack-Token: $TOKEN" \
  -d '{
    "task": "the user query as a single prompt",
    "hint": "code",
    "max_tokens": 512
  }'
```

Returns `{response, model_used, route_reason, hint_received}`.

## Hint values

| Hint | Routes to | When to use |
|---|---|---|
| `code` | Llama 4 Scout (US) | Code questions, technical reasoning |
| `translate` | Mistral Small 3.1 | Multilingual / translation |
| `reflect` | Gemma 3 12B | Measured, reflective register |
| `research` | Llama 4 Scout (stub — Perplexity in v0.3) | Research questions |
| `factcheck` | Llama 4 Scout (stub — multi-model in v0.3) | Verification questions |
| (none) | Llama 4 Scout (default) | Anything else |

## Failure behavior

If the Worker returns an error or is unreachable, surface the error to the user. Do NOT silently fall back to a different model — the route_reason is part of the contract.
