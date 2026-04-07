import { isSaasEnabled } from "@/lib/config";

import LandingPage from "@/components/landing/LandingPage";

export default async function Page() {
  if (!isSaasEnabled) {
    return <LandingPage />;
  }

  const { default: SaasLandingPage } = await import(
    "@saas/routes/(saas)/page"
  );
  return <SaasLandingPage />;
}
