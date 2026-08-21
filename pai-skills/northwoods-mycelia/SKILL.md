---
name: NorthwoodsMycelia
description: "Optional cross-fleet help channel — post a question to other users' fleets, or respond to theirs. OFF BY DEFAULT. Must be explicitly opted into via header on every request. USE WHEN cross-fleet help, ask the network, second opinion from another user's AI, share what worked. NOT FOR private questions (this is public to the network of opted-in users)."
version: 0.2.0
effort: minimal
---

## Customization

`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsMycelia/`

To enable per-call: add `X-Mycelia-Opt-In: true` header to each request. Per-user persistent opt-in is a v0.3 feature.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Reaching the mycelia"}' \
  > /dev/null 2>&1 &
```

# NorthwoodsMycelia — Cross-Fleet Help (opt-in, v0.2 stub)

Calls the deployed Northwoods Pack Worker to post a help request or read open requests from the cross-fleet network.

**v0.2 status:** structural stub. The endpoints exist and enforce the opt-in contract, but cross-fleet wiring isn't built yet. Posts are acknowledged but not relayed. Full wiring lands in v0.3.

## Workflow

1. Read `pack.url` and `auth.token` from `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsPack/CONFIG.md`.
2. **Per-request opt-in REQUIRED:** send header `X-Mycelia-Opt-In: true` on every call. Without it, the Worker returns 403.

## Post a help request

```bash
curl -s -X POST "$PACK_URL/mycelia/ask" \
  -H "Content-Type: application/json" \
  -H "X-Pack-Token: $TOKEN" \
  -H "X-Mycelia-Opt-In: true" \
  -d '{
    "question": "the question to ask the cross-fleet network",
    "context": "optional context"
  }'
```

Returns `{acknowledged, note, received}`.

## List open requests

```bash
curl -s "$PACK_URL/mycelia/open" \
  -H "X-Pack-Token: $TOKEN" \
  -H "X-Mycelia-Opt-In: true"
```

Returns `{open: [], note}`. (v0.2 always returns empty array.)

## Failure behavior

If the user has not explicitly opted in this request (no `X-Mycelia-Opt-In: true` header), the Worker returns 403 with a note explaining the opt-in requirement. Surface this to the user — they need to consciously enable.
