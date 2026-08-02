---
name: Discord mention understanding
description: How the bot should interpret member mentions in contextual messages.
---

Discord mention markup such as `<@id>` is not meaningful enough for the language model by itself. Resolve mentions to a display name before sending the current message or recent history to the model, while retaining a generic placeholder when the member cannot be resolved. Agreement questions about a mentioned member should be answered directly before adding the bot's personality.

**Why:** Raw Discord mention IDs caused the bot to miss questions asking whether it disliked a specific server member.

**How to apply:** Normalize mentions in both current messages and fetched history, and keep explicit handling for common French contractions such as « t'aime pas » and « n'aime pas ».