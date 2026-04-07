## 1. Database Schema & Models

- [x] 1.1 Add `AICallType` enum to Prisma schema
- [x] 1.2 Add `AICallLog` model for AI call tracking
- [x] 1.3 Add `ArticleClusterType` enum with all cluster types
- [x] 1.4 Add `ArticleClusterStatus` enum
- [x] 1.5 Add `Article` model with content and SEO fields
- [x] 1.6 Add `ArticleCluster` model with cluster parameters and tracking
- [x] 1.7 Add `ArticleGenerationLog` model for generation history
- [x] 1.8 Run Prisma migration: `npx prisma db push`
- [x] 1.9 Generate Prisma client

## 2. AI Service Infrastructure

- [x] 2.1 Create `src/lib/ai/ai-service.ts` with Azure OpenAI integration
- [x] 2.2 Implement `AIService.generateText()` with tracking
- [x] 2.3 Implement cost calculation based on Azure OpenAI pricing
- [x] 2.4 Export singleton `aiService` instance
- [x] 2.5 Add environment variables to `.env.example`: `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_DEPLOYMENT_NAME`, `AZURE_SEO_DEPLOYMENT_NAME`
- [x] 2.6 Add `CRON_SECRET` to environment variables

## 3. Content Generation Pipeline

- [x] 3.1 Create `src/lib/seo/cluster-data.ts` with cluster type definitions and metadata
- [x] 3.2 Create `src/lib/seo/cluster-templates.ts` with AI prompt templates per cluster type
- [x] 3.3 Create `src/lib/seo/seo-generator.ts` with main generation logic
- [x] 3.4 Implement `generateClusterContent()` function
- [x] 3.5 Implement `validateContentQuality()` for quality checks
- [x] 3.6 Implement `calculateContentHash()` for uniqueness detection
- [x] 3.7 Implement `checkDuplicateContent()` database check
- [x] 3.8 Implement `findRelatedClusters()` for internal linking

## 4. Cluster Seed Data

- [x] 4.1 Create `scripts/generate-article-seeds.ts` script
- [x] 4.2 Define use_case clusters (50 articles)
- [x] 4.3 Define productivity_tip clusters (100 articles)
- [x] 4.4 Define feature_guide clusters (80 articles)
- [x] 4.5 Define comparison clusters (40 articles)
- [x] 4.6 Define integration clusters (30 articles)
- [x] 4.7 Define industry clusters (100 articles)
- [x] 4.8 Define role clusters (80 articles)
- [x] 4.9 Define problem_solution clusters (120 articles)
- [x] 4.10 Define best_practice clusters (100 articles)
- [x] 4.11 Define seasonal clusters (50 articles)
- [x] 4.12 Define template clusters (50 articles)
- [x] 4.13 Define long_tail clusters (200 articles)
- [x] 4.14 Add slug generation utility
- [x] 4.15 Add priority score calculation

## 5. Cron Job API

- [x] 5.1 Create `src/app/api/cron/generate-article/route.ts`
- [x] 5.2 Implement cron secret authentication
- [x] 5.3 Implement cluster selection (highest priority pending)
- [x] 5.4 Implement status locking (pending → generating)
- [x] 5.5 Implement async generation with non-blocking response
- [x] 5.6 Implement success handling (create Article, update cluster status)
- [x] 5.7 Implement failure handling (update cluster status, log error)
- [x] 5.8 Implement email notification trigger on completion

## 6. Admin API Routes

- [x] 6.1 Create `src/app/api/admin/articles/route.saas.ts` (GET list)
- [x] 6.2 Implement filtering by status, clusterType
- [x] 6.3 Implement pagination
- [x] 6.4 Create `src/app/api/admin/articles/[id]/route.saas.ts` (GET single)
- [x] 6.5 Create `src/app/api/admin/articles/[id]/generate/route.saas.ts` (POST manual generate)
- [x] 6.6 Create `src/app/api/admin/articles/[id]/publish/route.saas.ts` (POST publish)
- [x] 6.7 Create `src/app/api/admin/articles/[id]/skip/route.saas.ts` (POST skip)
- [x] 6.8 Create `src/app/api/admin/articles/stats/route.saas.ts` (GET statistics)
- [x] 6.9 Add admin role check middleware to all routes

## 7. Admin Dashboard UI

- [x] 7.1 Create `src/app/(saas)/admin/articles/page.saas.tsx` client component
- [x] 7.2 Implement filter UI (status, cluster type dropdown)
- [x] 7.3 Implement statistics display (total, by status, cost, tokens)
- [x] 7.4 Implement article list table with pagination
- [x] 7.5 Implement manual generate button with loading state
- [x] 7.6 Implement publish button
- [x] 7.7 Implement skip button
- [x] 7.8 Implement article preview modal
- [x] 7.9 Add admin route to settings navigation

## 8. Public Article Routes

- [x] 8.1 Create `src/app/learn/[slug]/page.tsx` for public article view
- [x] 8.2 Implement article metadata (title, description, OG tags)
- [x] 8.3 Render HTML content with Tailwind styling
- [x] 8.4 Implement structured data (Article schema)
- [x] 8.5 Style article page with Tailwind (consistent with site design)
- [x] 8.6 Add related articles section
- [x] 8.7 Add CTA to FluidCalendar signup
- [x] 8.8 Create `src/app/learn/page.tsx` index page

## 9. Sitemap

- [x] 9.1 Create `src/app/sitemap.ts`
- [x] 9.2 Query all published articles for sitemap
- [x] 9.3 Set appropriate changeFrequency and priority based on cluster type
- [x] 9.4 Add static pages (landing, learn index)
- [x] 9.5 Set dynamic revalidation (1 hour cache)

## 10. Email Notifications

- [x] 10.1 Create `src/lib/seo/email.ts` with `sendArticleGenerationNotification()`
- [x] 10.2 Implement success variant (published, needs_review)
- [x] 10.3 Implement failure variant with error message
- [x] 10.4 Add cluster queue statistics section
- [x] 10.5 Add "Review Articles" CTA button
- [x] 10.6 Integrate with existing Resend email infrastructure

## 11. Kubernetes Deployment

- [x] 11.1 Create `k8s/cron-generate-articles.yaml` CronJob manifest
- [x] 11.2 Configure schedule (0 */12 * * * for 2x daily)
- [x] 11.3 Add CRON_SECRET from Kubernetes secrets

## 12. Testing & Validation

- [x] 12.1 Run TypeScript type checking
- [x] 12.2 Run ESLint

## Implementation Notes

- Used `@ai-sdk/azure` for Azure OpenAI integration
- Article content is generated as HTML with proper structure (h2, h3, p tags)
- Content validation checks for minimum 1,500 words, brand mentions, and proper structure
- Email notifications use both the SaaS email queue and fallback to direct Resend
- Admin dashboard uses React Query for data fetching and mutations
- Public pages include JSON-LD structured data for SEO
