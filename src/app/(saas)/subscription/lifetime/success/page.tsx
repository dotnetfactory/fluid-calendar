import { notFound } from "next/navigation";

import { isSaasEnabled } from "@/lib/config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page(props: Props) {
  if (!isSaasEnabled) return notFound();
  const { default: Component } = await import(
    "@saas/routes/(saas)/subscription/lifetime/success/page"
  );
  return <Component {...props} />;
}
