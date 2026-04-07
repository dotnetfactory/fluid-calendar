import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function Page(props: PageProps) {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import(
    "@saas/routes/book/book/manage/[bookingId]/page"
  );
  return <Component {...props} />;
}
