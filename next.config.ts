import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Disable all development indicators
  devIndicators: false,

  // Enable standalone output for Docker deployment
  output: "standalone",

  // Determine which file extensions to use based on SAAS enablement
  pageExtensions: (() => {
    const isSaasEnabled =
      process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true";

    // Base extensions
    const baseExtensions = ["js", "jsx", "ts", "tsx"];

    if (isSaasEnabled) {
      // For SAAS version, include .saas. files and exclude .open. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `saas.${ext}`),
      ].filter((ext) => !ext.includes(".open."));
    } else {
      // For open source version, include .open. files and exclude .saas. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `open.${ext}`),
      ].filter((ext) => !ext.includes(".saas."));
    }
  })(),
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "elitecoders",
  project: "fluidcalendar",
  sentryUrl: "https://glitchtip.hub.elitecoders.ai/",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
