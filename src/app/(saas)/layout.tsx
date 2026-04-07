import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSaasEnabled) return notFound();
  const { default: SaasLayout } = await import("@saas/routes/(saas)/layout");
  return <SaasLayout>{children}</SaasLayout>;
}
