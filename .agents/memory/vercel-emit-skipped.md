---
name: Vercel emit skipped
description: Vercel TypeScript builder constraint for workspace project references.
---

Vercel's Node TypeScript builder can report `file.ts: Emit skipped` when an entrypoint imports a workspace package whose referenced tsconfig uses `emitDeclarationOnly`. Runtime routes used by the Vercel entrypoint should avoid that declaration-only dependency or import a runtime-emitting package instead.

**Why:** The API health route imported the workspace Zod package, which resolves through a declaration-only project. Local esbuild and `tsc --noEmit` passed, but Vercel's per-file compiler rejected the route.

**How to apply:** Keep lightweight health and Vercel entrypoint routes runtime-only; validate the deployed entrypoint separately from the monorepo typecheck.