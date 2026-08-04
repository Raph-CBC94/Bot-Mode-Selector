---
name: Discord reply reliability
description: The typing indicator can outlive a failed AI request or Discord send, so bot replies need bounded generation and send fallbacks.
---

The typing indicator is not evidence that a reply will arrive. AI generation and Discord sends must each have explicit timeouts, local fallback content, retries, and a final channel-send fallback.

**Why:** A bot can visibly type while an upstream request or message reply silently fails, leaving users with no response.

**How to apply:** Keep bounded AI waits and resilient send logic whenever changing the Discord message pipeline. In this Vercel-only webhook, keep the direct single-response flow with a short AI timeout and the mode-specific local fallback; do not introduce deferred follow-ups unless the deployment runtime is configured for them.