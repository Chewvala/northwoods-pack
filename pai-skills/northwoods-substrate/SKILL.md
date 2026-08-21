---
name: NorthwoodsSubstrate
description: "Persistent memory store — second brain backed by D1 on user's own CF account. Save and retrieve entries across sessions and devices. USE WHEN need to remember, recall, search past notes, save a thought, look up what user said earlier, store a decision, find a breadcrumb. NOT FOR ephemeral session state (use conversation context instead)."
version: 0.2.0
effort: minimal
---

## Customization

`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsSubstrate/`

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Reaching the substrate"}' \
  > /dev/null 2>&1 &
```

# NorthwoodsSubstrate — Memory Store

Calls the deployed Northwoods Pack Worker (one Worker, five modules) to read/write persistent memory entries.

## Workflow

1. Read `pack.url` and `auth.token` from `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsPack/CONFIG.md`.
2. Use one of three endpoints depending on intent:
   - **Save:** `POST {pack.url}/substrate/remember`
   - **Search:** `POST {pack.url}/substrate/recall`
   - **List by tag/type:** `GET {pack.url}/substrate/list?tag=X&type=Y&limit=N`
3. All requests require header `X-Pack-Token: {auth.token}`.

## Save an entry

```bash
curl -s -X POST "$PACK_URL/substrate/remember" \
  -H "Content-Type: application/json" \
  -H "X-Pack-Token: $TOKEN" \
  -d '{
    "type": "breadcrumb",
    "body": "the thing to remember",
    "tags": ["topic1", "topic2"]
  }'
```

Common types: `breadcrumb`, `decision`, `note`, `question`, `session`. Returns `{id, created_at}`.

## Search entries

```bash
curl -s -X POST "$PACK_URL/substrate/recall" \
  -H "Content-Type: application/json" \
  -H "X-Pack-Token: $TOKEN" \
  -d '{
    "query": "search term",
    "tags": ["optional"],
    "type": "optional",
    "limit": 20
  }'
```

Returns `{entries: [...], count: N}`.

## List by tag

```bash
curl -s "$PACK_URL/substrate/list?tag=topic1&limit=10" \
  -H "X-Pack-Token: $TOKEN"
```

## Failure behavior

If the Worker is unreachable, surface the error clearly. Do NOT silently swallow substrate writes — the user needs to know their thought wasn't saved.
