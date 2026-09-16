// esbuild.config.js
const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    platform: "node",
    target: "node18",
    alias: {
      "@": "./src",
    },
    sourcemap: true,
    format: "cjs",
    logLevel: "info",
    minify: true,
    // OpenTUI ships native Zig binaries + ESM — keep external so the
    // correct platform package is resolved at runtime (Bun / Node FFI).
    external: ["@opentui/core", "@opentui/core/*"],
    banner: {
      js: "#!/usr/bin/env node",
    },
  })
  .catch(() => process.exit(1));
