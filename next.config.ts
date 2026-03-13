import type { NextConfig } from "next";
import * as fs from "fs";
import * as path from "path";

/**
 * Detect if the SaaS submodule is present and populated
 */
const detectSaasSubmodule = (): boolean => {
  try {
    const saasAppDir = path.join(process.cwd(), "saas", "app", "(saas)");
    return fs.existsSync(saasAppDir) && fs.readdirSync(saasAppDir).length > 0;
  } catch {
    return false;
  }
};

/**
 * Detect if the SaaS src/ re-export layer exists (new alias-based architecture).
 * When saas/src/index.ts exists, @saas imports resolve to saas/src/ instead of src/features/.
 */
const detectSaasSrc = (): boolean => {
  try {
    return fs.existsSync(
      path.join(process.cwd(), "saas", "src", "index.ts")
    );
  } catch {
    return false;
  }
};

const hasSaasSubmodule = detectSaasSubmodule();
const hasSaasSrc = detectSaasSrc();

// Respect explicit env var override. When NEXT_PUBLIC_ENABLE_SAAS_FEATURES is
// explicitly "false" (e.g. build:os), disable SaaS even if submodule is present.
const isExplicitlyDisabled =
  process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "false";
const isSaasEnabled =
  !isExplicitlyDisabled &&
  (process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true" ||
    hasSaasSubmodule);

// Determine @saas alias target:
// - If SaaS src/ layer exists and SaaS is enabled → saas/src/ (real implementations)
// - Otherwise → src/features/ (OS stubs)
// Absolute path for webpack, relative for Turbopack
const saasAliasPath =
  isSaasEnabled && hasSaasSrc
    ? path.join(process.cwd(), "saas", "src")
    : path.resolve(process.cwd(), "src", "features");
const saasAliasRelative =
  isSaasEnabled && hasSaasSrc ? "./saas/src" : "./src/features";

// Log detection status during build
if (
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PHASE === "phase-production-build"
) {
  console.log(`\n[next.config] SaaS Detection:`);
  console.log(`  - Submodule present: ${hasSaasSubmodule}`);
  console.log(`  - SaaS src/ layer: ${hasSaasSrc}`);
  console.log(
    `  - Env var: ${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES ?? "(not set)"}`
  );
  console.log(`  - SaaS enabled: ${isSaasEnabled}`);
  console.log(`  - @saas alias: ${saasAliasPath}\n`);
}

const nextConfig: NextConfig = {
  // Disable all development indicators
  devIndicators: false,

  // Enable standalone output for Docker deployment
  output: "standalone",

  // Expose SaaS detection to client-side code
  env: {
    NEXT_PUBLIC_HAS_SAAS: isSaasEnabled ? "true" : "false",
  },

  // Standard page extensions only — no .saas. or .open. suffixes needed.
  // SaaS content is provided via symlinks from setup-saas.ts when the submodule is present.
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  // Transpile SaaS package when using the src/ re-export layer
  transpilePackages:
    isSaasEnabled && hasSaasSrc
      ? [path.join(process.cwd(), "saas", "src")]
      : [],

  // Turbopack configuration for path aliases (dev server)
  turbopack: {
    resolveAlias: {
      "@saas": saasAliasRelative,
      "@saas/*": `${saasAliasRelative}/*`,
    },
  },

  // Webpack configuration for path aliases (production builds)
  webpack: (config, { webpack }) => {
    // Use NormalModuleReplacementPlugin to rewrite @saas/* imports BEFORE
    // the resolver runs. This prevents JsConfigPathsPlugin (which reads
    // tsconfig paths) from overriding the alias with the OS-stub path.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@saas(\/|$)/,
        (resource: { request: string }) => {
          resource.request = resource.request.replace(
          /^@saas(\/|$)/,
          saasAliasPath + "$1"
        );
      })
    );
    return config;
  },
};

export default nextConfig;
