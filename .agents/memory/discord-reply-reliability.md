---
name: Discord reply reliability
description: The typing indicator can outlive a failed AI request or Discord send, so bot replies need bounded generation and send fallbacks.
---

The typing indicator is not evidence that a reply will arrive. AI generation and Discord sends must each have explicit timeouts, local fallback content, retries, and a final channel-send fallback.

**Why:** A bot can visibly type while an upstream request or message reply silently fails, leaving users with no response.

**How to apply:** Keep bounded AI waits and resilient send logic whenever changing the Discord message pipeline.