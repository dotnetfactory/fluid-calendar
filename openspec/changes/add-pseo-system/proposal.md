# Change: Add Programmatic SEO System

## Why

FluidCalendar needs organic traffic growth through search engines. A programmatic SEO (pSEO) system can generate 1,000+ targeted articles covering calendar management, productivity, task scheduling, time management, and related topics. This follows the proven pattern from FamilyGPT with AI-powered content generation, admin dashboards, automated scheduling, and email notifications.

## What Changes

- **Database Models**: Add `Article`, `ArticleCluster`, `ArticleGenerationLog`, and `AICallLog` tables to track content and AI usage
- **AI Service**: Create centralized AI service using Azure OpenAI (same endpoints/keys as FamilyGPT) with call tracking, cost calculation, and token logging
- **Content Generation**: Build article generation pipeline with quality validation, uniqueness checking, and internal linking
- **Admin Dashboard**: Create admin-only `/admin/articles` page with filtering, statistics, manual generation, publish/review workflow (following FamilyGPT patterns)
- **Cron Job**: Implement `/api/cron/generate-article` endpoint triggered by Kubernetes CronJob to generate 2 articles per day
- **Sitemap**: Dynamic sitemap at `/sitemap.xml` including all published articles
- **Email Notifications**: Send admin emails on article generation completion (published/needs_review/failed) using React Email templates
- **Public Routes**: `/learn/[slug]` for viewing published articles

## Impact

- Affected specs: New capability (pseo)
- Affected code:
  - `prisma/schema.prisma` - New models
  - `src/lib/ai-service.ts` - New AI service
  - `src/lib/seo-generator.ts` - Content generation
  - `src/lib/email.ts` - Email service extensions
  - `src/app/admin/articles/` - Admin dashboard
  - `src/app/api/admin/articles/` - Admin API routes
  - `src/app/api/cron/generate-article/` - Cron endpoint
  - `src/app/learn/[slug]/` - Public article pages
  - `src/app/sitemap.ts` - Dynamic sitemap
  - `emails/ArticleGenerationComplete.tsx` - Email template
  - `k8s/cron-generate-articles.yml` - Kubernetes CronJob
