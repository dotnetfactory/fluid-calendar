import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page(props: PageProps) {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import(
    "@saas/routes/(marketing)/learn/learn/[slug]/page"
  );
  return <Component {...props} />;
}
