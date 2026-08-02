---
name: Discord mode command
description: Behavior and security boundary for changing the bot personality from Discord.
---

The bot supports `!mode`, `!mode aide`, and `!mode <mode>` in the channel configured by `ALLOWED_CHANNEL_ID`. Only Discord members with the Administrator permission can change or inspect the mode. The selected mode is held in memory and reverts to the `BOT_MODE` environment value after a restart.

**Why:** The user wanted to switch personalities without returning to Render, while preventing regular members from changing the bot's behavior.

**How to apply:** Keep mode changes scoped to the allowed channel, validate against the existing mode union, reject unknown values, and snapshot the current mode when normal messages enter the response queue.