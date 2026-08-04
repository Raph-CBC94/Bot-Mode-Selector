---
name: Vercel-only Discord bot
description: The Vercel-compatible Discord architecture and its user-visible limitation.
---

For a Vercel-only deployment, Discord must call a signed interactions webhook. The bot can respond to slash commands, but it cannot continuously listen to normal channel messages because Vercel functions do not maintain a Discord Gateway connection. `/mode` can update the in-memory mode for subsequent requests handled by the same warm instance, but `BOT_MODE` is the source of truth after cold starts.

**Why:** The user explicitly chose Vercel only, while the original implementation depended on Discord.js Gateway and Message Content events.

**How to apply:** Keep the webhook entry self-contained for Vercel. Require Discord's public key for signature verification, register slash commands through a protected setup endpoint, and clearly explain that normal-message monitoring is unavailable in this deployment mode. Treat runtime mode changes as best-effort instance-local state, not durable configuration.