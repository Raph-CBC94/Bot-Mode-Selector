---
name: Boastful bot mode
description: Durable behavior and configuration for the Discord bot's arrogant personality.
---

`BOT_MODE=vantard` is a supported third personality alongside `insulte` and `suceur`. It should answer the concrete message or question first, including questions about mentioned members, then add theatrical superiority and condescension. Local fallbacks must preserve this tone.

**Why:** The user requested a mode that constantly boasts about being superior and treats everyone else as inferior, while still understanding the conversation.

**How to apply:** Keep `vantard` in the mode union and startup parser, route it to its own prompt and fallback, and list the exact value on the root help page and project documentation.