import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

export default async function Page() {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import("@saas/routes/(marketing)/learn/learn/[slug]/page");
  return <Component />;
}
