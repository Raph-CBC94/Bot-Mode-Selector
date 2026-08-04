---
name: Vercel-only Discord bot
description: The Vercel-compatible Discord architecture and its user-visible limitation.
---

For a Vercel-only deployment, Discord must call a signed interactions webhook. The bot can respond to slash commands, but it cannot continuously listen to normal channel messages because Vercel functions do not maintain a Discord Gateway connection. `/mode` persists the selected mode in the allowed channel topic, while `BOT_MODE` remains the fallback initial value when no stored mode is available.

**Why:** The user explicitly chose Vercel only, while the original implementation depended on Discord.js Gateway and Message Content events.

**How to apply:** Keep the webhook entry self-contained for Vercel. Require Discord's public key for signature verification, register slash commands through a protected setup endpoint, and clearly explain that normal-message monitoring is unavailable in this deployment mode. The bot needs Discord's **Manage Channel** permission to write the `[bot-mode:<mode>]` marker; otherwise `/bot mode:<mode>` is the reliable per-response override. Validate the generated personality for every mode, not only `insulte`, and use that mode's local fallback when Groq returns a neutral or mismatched tone.