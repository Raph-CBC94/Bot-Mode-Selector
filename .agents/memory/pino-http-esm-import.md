---
name: Pino HTTP ESM import
description: TypeScript module-resolution compatibility rule for the API server logger middleware.
---

With the workspace using ESM-oriented TypeScript settings and Vercel's compiler, `pino-http` can resolve a default import as a module namespace rather than a callable middleware. The package's named `pinoHttp` export preserves the callable type and serializer parameter inference.

**Why:** Vercel reported that the default-imported `pino-http` value had no call signatures and then inferred the serializer parameters as `any`, even though the local compiler accepted it.

**How to apply:** Keep the named `pinoHttp` import when editing the Express logging middleware or upgrading the package; validate with the deployment compiler/build, not only the local dev workflow.