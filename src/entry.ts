#!/usr/bin/env node
// Use React production build to avoid false-positive dev-mode warnings
// (React 19 + Ink reconciler emits spurious duplicate-key warnings in dev mode)
process.env.NODE_ENV ??= "production";
await import("./cli.js");
