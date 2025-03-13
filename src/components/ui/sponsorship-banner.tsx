import dynamic from "next/dynamic";

// Dynamically import the appropriate version based on SAAS enablement
const SponsorshipBannerComponent = dynamic(
  () =>
    import(
      `./sponsorship-banner${
        process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true"
          ? ".saas"
          : ".open"
      }`
    ).then((mod) => mod.default),
  {
    loading: () => null,
    ssr: false,
  }
);

export function SponsorshipBanner() {
  return <SponsorshipBannerComponent />;
}
