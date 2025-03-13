/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all development indicators
  devIndicators: {
    buildActivity: false,
    staticPageGenerationInfo: false,
  },

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

module.exports = nextConfig;
