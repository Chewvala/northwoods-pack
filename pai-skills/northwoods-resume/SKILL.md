---
name: NorthwoodsResume
description: "Session-start momentum restart — one forward-leaning sentence answering 'where was I.' Never reports timestamps, never lists incomplete tasks, never states a verdict. Restarts momentum, does not audit absence. USE WHEN session start, picking back up, where was I, resume work, getting back to it. NOT FOR status reports or progress summaries (use other tools)."
version: 0.2.0
effort: minimal
---

## Customization

`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsResume/`

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Picking up the thread"}' \
  > /dev/null 2>&1 &
```

# NorthwoodsResume — Momentum Restart

Calls the deployed Northwoods Pack Worker to retrieve a single forward-leaning sentence for session resume.

## Workflow

1. Read `pack.url` and `auth.token` from `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsPack/CONFIG.md`.
2. `GET {pack.url}/resume/momentum` with `X-Pack-Token: {auth.token}`.
3. Use the returned `pivot` string as the resume prompt for the user.

## Request

```bash
curl -s "$PACK_URL/resume/momentum" \
  -H "X-Pack-Token: $TOKEN"
```

Returns `{pivot: "one forward-leaning sentence"}`.

## Contract — what the resume Worker WILL return

Example correct response:
> *"You were sketching the install flow — pick it back up by reading the last note, it's a question, not a task."*

## Contract — what the resume Worker WILL NEVER return

The Worker is designed to refuse these shapes. If something matching them comes back, that's a bug:

- Timestamps (*"you stopped 3 days ago"*) — shame trigger
- Audit lists (*"you have 7 open tasks"*) — verdict
- Deficit framing (*"last session you didn't finish X"*) — pre-frame
- Status reports of any kind

## Failure behavior

If the Worker is unreachable, return a single neutral forward-leaning sentence drawn from the most-recent session memory available locally. NEVER ship a status report as a fallback.
