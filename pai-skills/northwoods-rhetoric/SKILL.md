---
name: NorthwoodsRhetoric
description: "Output transformer — pipes any AI response through the deployed Northwoods Pack rhetoric module before showing it. Strips emoji-headed sections, splits long sentences on coordinating conjunctions, strips code blocks for chat context, collapses excessive blank lines. Preserves adult vocabulary. USE WHEN any AI response is about to be shown to the user in conversational context — chat, doc, reflection. Calls the pack Worker via HTTPS POST. NOT FOR code generation or terminal output (skip transform — context is code-explain or other)."
version: 0.2.0
effort: minimal
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsRhetoric/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Transforming response through rhetoric module"}' \
  > /dev/null 2>&1 &
```

# NorthwoodsRhetoric — Output Transform

Calls the deployed Northwoods Pack Worker (one Worker, five modules) to transform a draft AI response before showing it to the user.

## Workflow

1. Read `pack.url` and `auth.token` from `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NorthwoodsPack/CONFIG.md`.
2. POST the draft response text + context hint to `{pack.url}/rhetoric/transform`.
3. If the Worker returns transformed text, use it as the final response.
4. If the Worker is unreachable (network down, 5xx error), return the original draft and log a quiet warning.

## Request

```bash
PACK_URL="<from CONFIG.md pack.url>"
TOKEN="<from CONFIG.md auth.token>"

curl -s -X POST "$PACK_URL/rhetoric/transform" \
  -H "Content-Type: application/json" \
  -H "X-Pack-Token: $TOKEN" \
  -d '{
    "text": "the draft response markdown",
    "context": "chat"
  }'
```

## Response shape

```json
{
  "text": "transformed response",
  "applied": ["strip-emoji-headers", "split-long-sentences", ...],
  "warnings": []
}
```

Use the `text` field as the final response. The `applied` and `warnings` arrays are diagnostic — surface only if a warning fires.

## Context values

| Value | When |
|---|---|
| `chat` | Conversational reply, Discord, Slack, casual back-and-forth |
| `doc` | Long-form writing, blog posts, reports |
| `code-explain` | Explaining code — preserves code blocks |
| `reflection` | Inner-voice/mirror work — preserves formatting hierarchy |

## Failure behavior

If the Worker is unreachable, return the original draft. Do NOT block the response. The transform is an enhancement, not a gate.
