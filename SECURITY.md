# Security

I spent twenty years breaking into systems for a living, so this file is short and honest.

**The model:** one bearer token you invent, on an account you own. The token gates chat, intake, MCP, and export. It rides in your MCP URL because chat clients can't set headers, that's a documented tradeoff, not an accident. Treat the URL as a credential. Rotating `DEMO_TOKEN` in your Cloudflare dashboard kills the old URL instantly and costs your data nothing. Memories marked `secret` never leave through recall, that rule is bound into the query, not written in a doc and hoped about.

**Found something?** Tell me privately first: open a [GitHub security advisory](../../security/advisories/new) on this repo. I'll respond fast, credit you fully if you want credit, and ship the fix before we talk about it in public. No bounty program, just a builder who takes reports seriously and says thank you like he means it.

**Out of scope:** your own deployed copy's configuration (your account, your keys), and the upstream platforms (Cloudflare, model providers), report those to their owners.
