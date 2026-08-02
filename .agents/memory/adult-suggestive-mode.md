---
name: Adult suggestive mode
description: Safety and behavior boundary for the Discord bot's adult personality.
---

`BOT_MODE=adulte` is a suggestive, non-graphic personality. It answers the user's actual question first, then adds light flirtation, innuendo, and playful emojis. It must not generate explicit sexual descriptions, involve minors, depict sexual violence or non-consensual content, or automatically sexualize mentioned Discord members.

**Why:** The requested adult mode was narrowed to a playful, safe version rather than crude or explicit sexual content.

**How to apply:** Keep the exact `adulte` value documented and selectable, route it through a dedicated prompt and local fallback, and preserve the non-graphic boundary in both AI instructions and mention-specific replies.