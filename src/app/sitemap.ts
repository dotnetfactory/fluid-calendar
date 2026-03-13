import { MetadataRoute } from "next";

/**
 * Sitemap shell.
 * OS mode: basic sitemap with core pages (from src/features/api/sitemap.ts)
 * SaaS mode: full sitemap including articles/learn pages (from saas/src/api/sitemap.ts)
 *
 * The @saas alias resolves to the correct implementation automatically.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { generateSitemap } = await import("@saas/api/sitemap");
  return generateSitemap();
}
