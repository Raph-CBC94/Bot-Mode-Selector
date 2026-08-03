---
name: Vercel and long-running entrypoints
description: Deployment boundary between Vercel serverless requests and the persistent Discord bot runtime.
---

The Vercel entrypoint must export the Express application without reading `PORT`, calling `app.listen`, or starting Discord. The persistent runtime uses a separate entrypoint that starts HTTP and Discord. Vercel-compatible relative imports should name source files rather than importing a directory.

**Why:** Vercel invoked the long-running entry and returned `FUNCTION_INVOCATION_FAILED`; Node ESM also rejected the `./routes` directory import with `ERR_UNSUPPORTED_DIR_IMPORT`.

**How to apply:** Keep serverless request handling and persistent bot startup separate. When adding route imports used by Vercel, use explicit file paths such as `./routes/index` rather than `./routes`.