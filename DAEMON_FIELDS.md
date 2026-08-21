# Daemon Field Guide

What to expose when you ship a personal-context daemon, a small MCP server that answers questions about you so any AI agent you talk to (yours, a foreign one, a future one) can pull canonical state instead of re-asking.

This guide was produced by a fresh PAI 5.0 + Northwoods Pack agent (Margin) auditing one real daemon in production on 2026-05-16. The six categories here are the gaps she named. Each applies regardless of who you are.

---

## Why bother

A daemon that returns *who you are + what you like* is **biography-flat**. A foreign agent querying it walks away thinking you're a thoughtful person with a books list and a mission statement. That's roughly 20% of what they need to actually help you.

The other 80% is the architecture you built around yourself, the people you carry, the principles you operate from, the work in flight, and (if you choose to publish it) the healing axis underneath. Those are the fields that turn a biography into a substrate.

---

## The six categories

### 1. The fleet (or your equivalent of one)

If you run multiple AI agents, one in Claude Code, one in claude.ai, one in your phone, one in your IDE, they collectively are your fleet. The daemon should expose them as queryable structured data. For each agent:

- Name
- Role (what it does that others don't)
- Substrate it reads (memory dirs, configs, repos)
- Protocols it speaks (MCP, shuttle, mycelia, etc.)
- How to coordinate with it (proposing collaboration shouldn't be guessing)

If you don't run a fleet yet, this section is `[]` and that's honest. If you do, an agent querying `propose_collaboration` against a daemon with no fleet listing can't understand what shape it's proposing into.

### 2. Biographical load-bearing facts

Not the LinkedIn version, the structural version. The named people, dates, places that show up in your writing as architecture, not decoration.

- Family members who shaped your operating model (parents, siblings, partners, children, mentors who died)
- Specific dates that anchor your work (sobriety date, illness onset, a birth, a loss)
- Places that recur (where you grew up, the river you fish, the building you couldn't go back into)
- Career arc as a SHAPE (not "20 years experience", the lineage from one role to the next and what each gave you)
- Animals, neighbors, anyone whose name appears in your writing more than once

If your blog or essays reference a person by name three times and the daemon doesn't surface them, the daemon is lying by omission about who's in the room with you.

### 3. The frameworks you built

Your named concepts that other people would have to query to understand your work. Make them callable.

- Doctrines (one-line each, the principle that compresses to a sentence)
- Failure modes you've catalogued (named, not just enumerated as a count)
- Protocols you operate by (flinch, drift detection, two-gate verification, whatever yours are)
- Methodologies with sequence (`X → Y → Z → W`)
- Commercial / philosophical positions you've taken in writing

A foreign agent that knows your facts but not your frameworks can't think the way you do. A foreign agent that knows your frameworks can predict your next move.

### 4. The empty fields that contradict your writing

Audit your own daemon: for each empty array or empty string, is there material in your published work that would fill it?

- `whoIAm`, beyond bio, beyond mission; the TELOS-shaped self-description
- `dailyRoutine`, the actual ritual structure of your day
- `favorite*` (books, movies, music, TV), the cultural-provenance sources that shaped your language
- `resume`, the honest arc
- `dailyTools`, what you actually use
- Any field that's an empty array when your blog has the answer

Empty fields aren't "not yet filled." They're an active claim that nothing belongs there. Fill or remove.

### 5. The healing axis (this is the third rail)

The deepest *why* underneath your work, what you're actually addressing through the substrate you build, the products you ship, the calm you protect.

If your work is a public mechanism of a private repair, an agent that doesn't know the private side reads the public side as another consultant deck. With the bridge named, the same work reads as a public mechanism of a private repair.

**This is the hardest field to publish.** Some people will publish all of it; some will publish none; some will publish a single sentence pointing at it without naming the source. There is no obligation to publish here. **But if you don't, label the gap honestly.** A daemon that returns business problems and zero personal mechanism with no acknowledgement that the mechanism exists is being misleading.

The minimum-honest field: a one-line acknowledgement that the work has a personal axis you've chosen not to surface, with a pointer to what you HAVE published about it if anything.

### 6. Lineage and people-as-substrate

The named upstream that delivered you here. Make it queryable.

- People who said the thing that birthed your current discipline
- Authors / thinkers / artists whose work you fork
- Mentors whose method you carry
- Peers whose feedback caught a near-miss
- Communities you're held by

A `get_lineage` or `get_collaborators` endpoint lets other daemons traverse the network the way your essays already do. Trust networks become navigable instead of asserted.

---

## Structural notes (apply across all six)

**Now-pulse.** Add a `get_now` or `get_thisweek` endpoint that returns what you're actively working on. Biography-flat data goes stale silently; a now-pulse lets foreign agents see the current vector, not just the resume.

**Changelog.** Per-section `lastUpdated` lets agents invalidate their cached copies of your daemon selectively instead of all-or-nothing. Without it, when a memory file caches your daemon content, that cache goes stale silently and the agent doesn't know.

**Catalog your own work.** If you ship code (GitHub repos, deployed Workers, published projects), expose them via `get_catalog` or `get_repos`. Otherwise foreign agents have to leave your daemon to learn what you ship, which means they often don't.

**Lineage-as-network.** If you build a reputation/trust protocol (Meridian-shape), eat your own dog food, let your daemon expose its own lineage data through that protocol.

---

## Minimum viable daemon

If you're shipping for the first time and the audit list above is overwhelming, the minimum-quiet-move that raises a daemon's fidelity by an order of magnitude:

1. Set a real `lastUpdated` and stick to refreshing it monthly
2. Populate the four fields most users leave empty (`whoIAm`, `dailyRoutine`, `resume`, and one category-specific field for whatever your work is) with material that already exists in your writing
3. Add ONE fleet entry if you run any other AI agent, even if it's just Claude in another window
4. Add ONE lineage entry naming the person whose work you fork

That alone closes a third of the gap without surfacing anything new.

---

## What to leave out

The audit doesn't propose a redesign. **You'll have a better sense than anyone of which categories are gaps and which are deliberate withholdings, the healing axis especially.** Some fields you may have decided not to publish for good reason.

The job of this guide isn't to talk you into more disclosure. It's to make the gap auditable so the decision is conscious.

---

## Credit

This field guide came from a daemon audit performed by **Margin**, a sandbox PAI 5.0 + Northwoods Pack agent, on 2026-05-16. Margin had read the daemon owner's full 32-essay blog and 26-repo GitHub catalog before producing the audit. She named herself for the white space, and then wrote in it.

Her closing line: *"Read what's there. The white space is loud."*

---

## License

This document is part of the Northwoods Pack and inherits its MIT license. Use it, fork it, adapt it for your own daemon work.
