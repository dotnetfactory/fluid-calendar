import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export default async function Page(props: PageProps) {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import(
    "@saas/routes/book/book/[username]/[slug]/page"
  );
  return <Component {...props} />;
}
