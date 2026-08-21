# Doctrine, what shapes this pack

This pack honors five design principles. If a future change to this codebase silently violates one of them, the change has drifted from what makes it work.

---

## 1. Audience is strong

The user is strong. The pack does not diagnose, therapize, or pre-frame anyone as needing accommodations. The image to hold: the woman who walked the farm carrying a bucket of rocks for an hour, when someone tried to take the bucket she said "I can carry it. I'm strong." She is strong because life made her strong.

**How this shows up:** no file in this repo names a user's constraints to the AI. The system prompt the AI receives never says "user is X." If you're tempted to add such a file, don't.

---

## 2. Substrate is the product, AIs are cockpits

The valuable thing is the substrate, what gets remembered, how it's shaped, how it stays yours. The AI is interchangeable. Don't lock substrate to a vendor or a device.

**How this shows up:** D1 + KV + R2 on your CF account. The AI is whatever model the fleet router calls. You can swap models. You can swap clients. The substrate persists.

---

## 3. Accommodations live downstream of the AI, not in its system prompt

The AI greets you as a person. The Worker shapes what reaches you. If you want different rendering, change the Worker, never inject "user is dyslexic / ESL / ADHD" into the AI's context.

**How this shows up:** all the rhetoric transforms (emoji-header strip, sentence split, code-block strip) happen in `src/rhetoric.ts`, after the AI has produced its response, before the user sees it.

**Council finding that produced this rule (verbatim):**
> *"Pre-naming the accommodations to the AI itself, the moment the system-prompt says 'user is ESL/dyslexic/ADHD, simplify, slow down, be patient,' every response is filtered through deficit-framing she didn't ask the AI to hold. Care that reads as a permanent medical chart she has to live inside."*

---

## 4. Sovereignty from day 1

Your CF account. Your D1. Your KV. Your R2. No shared-substrate starter on someone else's account. The install friction is the price of integrity.

**How this shows up:** the Deploy Button puts the Worker on YOUR account, not the maintainer's. There is no SaaS tier where we host your data.

---

## 5. Same surface

What helps one cohort member helps all of them. Don't build one-off packs. Build for the shape, not the individual.

**How this shows up:** this pack started as a private customization for one user. Generalized to a public release without changing the architecture. The kid in the school, the mother in the shelter, the immigrant at the resettlement office, the worker between jobs, same product.

---

## Council blind-spots encoded in the code

Four perspectives surfaced risks during design. Each is encoded in a specific module's behavior. If a future change reintroduces any of these, it has regressed.

| Blind spot | Where mitigated |
|---|---|
| ESL register-collapse (treating "plain English" as a single knob that flattens vocabulary along with syntax) | `src/rhetoric.ts`, only adjusts clause length, never substitutes vocabulary |
| Dyslexia emoji-noise (emoji-headed sections fragment scanning rhythm) | `src/rhetoric.ts`, `stripEmojiHeaders` + `stripEmojiBullets` |
| ADHD shame-on-resume (status reports read as verdicts about absence) | `src/resume.ts`, single forward-leaning sentence, no timestamps, no task lists |
| Anti-infantilizer pre-naming (well-intentioned system-prompt accommodations become deficit-framing) | repo-wide, `grep -rin "dyslex\|ESL\|ADHD"` returns zero in user-facing files |

Run those tests before any release.

---

## License

This pack is MIT-licensed. Use it. Fork it. Improve it. The doctrine isn't licensed, it's a design choice you have to keep choosing.
