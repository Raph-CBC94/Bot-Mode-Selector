---
name: Vercel self-contained app
description: Fallback architecture for Vercel when local workspace route imports fail at runtime.
---

When Vercel's runtime cannot resolve local route imports from the monorepo, keep the serverless Express app entry self-contained: define its health endpoint and logging setup directly in the app module, while the persistent bot runtime may continue using a separate startup entry.

**Why:** Vercel repeatedly failed with `ERR_MODULE_NOT_FOUND` for the local `routes/index` import even after removing the directory import.

**How to apply:** Prefer the self-contained Vercel app entry for this project unless the Vercel project root and compiler configuration are intentionally changed together.