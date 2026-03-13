## Context

FluidCalendar is an intelligent calendar and task scheduling SaaS. To drive organic traffic, we need a programmatic SEO (pSEO) system that generates ~1,000 articles targeting calendar management, productivity, and time management keywords.

This design follows patterns established in FamilyGPT:
- Centralized AI service with tracking
- Admin dashboard for content management
- Automated cron-based generation
- Email notifications for admin visibility
- React Email templates

### Stakeholders
- **Marketing**: Drive organic traffic and brand awareness
- **Engineering**: Maintain clean architecture, avoid complexity
- **Operations**: Monitor generation costs and article quality

### Constraints
- Must use same AI endpoints/keys as FamilyGPT (Azure OpenAI, secrets in .env)
- Must follow FluidCalendar's existing auth patterns (admin role check)
- Must integrate with existing email infrastructure (Resend)
- SaaS-only feature (gated behind NEXT_PUBLIC_ENABLE_SAAS_FEATURES)

## Goals / Non-Goals

### Goals
- Generate 2 articles per day via automated cron job
- Target 1,000 total articles across multiple content clusters
- Provide admin dashboard for review, publish, and management
- Track AI costs and token usage for monitoring
- Send email notifications on generation events
- Include articles in sitemap for SEO indexing

### Non-Goals
- Image generation (text-only for now)
- Multi-language support (English only)
- User-generated content
- Comments or social features on articles
- Real-time analytics integration

## Decisions

### Decision 1: Azure OpenAI via Vercel AI SDK
**What**: Use Azure OpenAI with `@ai-sdk/azure` for content generation, consistent with FamilyGPT.
**Why**:
- Enterprise compliance and data residency
- Shared infrastructure with FamilyGPT simplifies ops
- Proven cost-effective for long-form content generation

### Decision 2: Centralized AI Service with Tracking
**What**: All AI calls go through `src/lib/ai-service.ts` which logs to `AICallLog` table.
**Why**:
- Cost visibility and budget monitoring
- Performance tracking (tokens, duration)
- Audit trail for generated content
- Easy model switching without code changes

### Decision 3: Cluster-Based Content Organization
**What**: Organize articles into clusters by topic type (use cases, comparisons, tips, etc.).
**Why**:
- Systematic keyword coverage
- Internal linking opportunities
- Priority-based generation queue
- Scalable to 1,000+ articles

### Decision 4: Two-Stage Generation Pipeline
**What**: Generate articles in DRAFT status, require admin review before publishing.
**Why**:
- Quality control before public visibility
- Catch AI hallucinations or off-brand content
- Compliance with content policies
- Can auto-publish if quality validation passes

### Decision 5: Kubernetes CronJob Trigger
**What**: External cron job calls `/api/cron/generate-article` with secret authentication.
**Why**:
- Decoupled from app lifecycle
- Reliable scheduling with K8s
- Easy to adjust frequency
- Matches FamilyGPT pattern

### Alternatives Considered
1. **LangChain/LangGraph**: Overkill for straightforward content generation
2. **Direct OpenAI**: No enterprise compliance, different billing
3. **BullMQ background jobs**: More complex, cron is simpler for this use case
4. **On-demand generation only**: Slower to reach 1,000 articles

## Content Cluster Strategy

### Cluster Types (Priority Order)

| Cluster Type | Description | Priority | Target Count |
|--------------|-------------|----------|--------------|
| `use_case` | Specific use cases (team scheduling, family calendars) | 90-100 | 50 |
| `productivity_tip` | Time management and productivity advice | 85-95 | 100 |
| `feature_guide` | How to use FluidCalendar features | 80-90 | 80 |
| `comparison` | FluidCalendar vs competitors (Motion, Calendly, etc.) | 75-85 | 40 |
| `integration` | Calendar integration guides (Google, Outlook, CalDAV) | 70-80 | 30 |
| `industry` | Industry-specific calendaring (healthcare, education, etc.) | 65-75 | 100 |
| `role` | Role-specific tips (managers, freelancers, students) | 60-70 | 80 |
| `problem_solution` | Common scheduling problems and solutions | 55-65 | 120 |
| `best_practice` | Calendar management best practices | 50-60 | 100 |
| `seasonal` | Time-based content (new year planning, back to school) | 45-55 | 50 |
| `template` | Calendar template guides and examples | 40-50 | 50 |
| `long_tail` | Long-tail keyword articles | 35-45 | 200 |

**Total Target: ~1,000 articles**

### Content Parameters

Each cluster type has specific parameters:
- `use_case`: useCase, targetAudience
- `comparison`: competitor, focusArea
- `industry`: industry, useCase
- `role`: role, scenario
- `integration`: provider, featureSet

## Database Schema

```prisma
enum ArticleClusterType {
  use_case
  productivity_tip
  feature_guide
  comparison
  integration
  industry
  role
  problem_solution
  best_practice
  seasonal
  template
  long_tail
}

enum ArticleClusterStatus {
  pending
  generating
  published
  needs_review
  failed
  skipped
}

enum AICallType {
  SEO_CONTENT_GENERATION
  // Other types can be added later
}

model Article {
  id         String   @id @default(cuid())
  slug       String   @unique
  title      String
  content    String   @db.Text
  excerpt    String
  published  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  cluster ArticleCluster?

  @@index([slug])
  @@index([published])
}

model ArticleCluster {
  id            String               @id @default(cuid())
  clusterType   ArticleClusterType

  // Cluster parameters
  useCase       String?
  targetAudience String?
  competitor    String?
  industry      String?
  role          String?
  provider      String?
  focusArea     String?
  scenario      String?

  // SEO metadata
  slug              String  @unique
  title             String
  metaDescription   String
  keywords          String? // JSON array
  priorityScore     Int     // 35-100

  // Generation tracking
  status            ArticleClusterStatus @default(pending)
  generationAttempts Int                 @default(0)
  contentHash       String?
  publishedAt       DateTime?
  errorMessage      String?

  // Metadata
  metadata   String? // JSON
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  articleId  String?  @unique
  article    Article? @relation(fields: [articleId], references: [id])
  logs       ArticleGenerationLog[]

  @@index([status, priorityScore(sort: Desc)])
  @@index([clusterType])
}

model ArticleGenerationLog {
  id           String         @id @default(cuid())
  clusterId    String
  cluster      ArticleCluster @relation(fields: [clusterId], references: [id], onDelete: Cascade)

  status       String // 'running', 'success', 'failure'
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  durationMs   Int?
  wordCount    Int?
  errorMessage String?
  errorStack   String?

  // Email tracking
  emailSent    Boolean @default(false)
  emailError   String?

  @@index([clusterId])
  @@index([startedAt])
}

model AICallLog {
  id               String      @id @default(cuid())
  type             AICallType
  model            String
  startTime        DateTime
  endTime          DateTime?
  durationMs       Int?
  prompt           String?     @db.Text
  response         String?     @db.Text
  tokensPrompt     Int?
  tokensCompletion Int?
  tokensTotal      Int?
  costUsd          Float?
  metadata         String?     // JSON
  error            String?

  createdAt        DateTime    @default(now())

  @@index([type])
  @@index([createdAt])
  @@index([model])
}
```

## API Design

### Cron Endpoint
```
POST /api/cron/generate-article
Headers: x-cron-secret: $CRON_SECRET

Response (200):
{
  "message": "Generation started",
  "generated": true,
  "requestId": "abc12345",
  "cluster": {
    "id": "...",
    "slug": "...",
    "priority": 90
  }
}

Response (200, no pending):
{
  "message": "No pending clusters to generate",
  "generated": false
}
```

### Admin API
```
GET /api/admin/articles
  ?status=pending|published|needs_review|failed
  ?clusterType=use_case|comparison|...
  ?page=1
  &limit=20

POST /api/admin/articles/[id]/generate
  - Manually trigger generation for specific cluster

POST /api/admin/articles/[id]/publish
  - Publish a draft article

POST /api/admin/articles/[id]/skip
  - Skip a cluster

GET /api/admin/articles/stats
  - Return aggregate statistics
```

## Email Notification

Uses React Email template `ArticleGenerationComplete.tsx`:
- Sent on each generation completion
- Includes: slug, title, status, word count, duration, validation issues
- Includes cluster queue statistics (pending, published, needs review, failed)
- Links to admin dashboard for review

## Environment Variables

```env
# AI Service (same as FamilyGPT)
AZURE_RESOURCE_NAME="your-resource-name"
AZURE_API_KEY="your-azure-api-key"
AZURE_DEPLOYMENT_NAME="gpt-4o"
AZURE_SEO_DEPLOYMENT_NAME="gpt-4o-mini"  # Optional, cheaper model for SEO

# Cron Security
CRON_SECRET="your-cron-secret"

# Admin notifications
ADMIN_EMAIL="admin@fluidcalendar.com"
```

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: generate-seo-articles
spec:
  schedule: "0 */12 * * *"  # Every 12 hours = 2x daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: trigger
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST \
                -H "x-cron-secret: $CRON_SECRET" \
                https://app.fluidcalendar.com/api/cron/generate-article
          restartPolicy: OnFailure
```

## Risks / Trade-offs

### Risk: AI Content Quality
**Mitigation**: Two-stage pipeline (draft → review → publish), quality validation checks (word count, structure, brand mentions)

### Risk: High AI Costs
**Mitigation**: Use cheaper model (gpt-4o-mini) for SEO content, track costs in AICallLog, can adjust generation frequency

### Risk: Duplicate/Thin Content
**Mitigation**: Content hash validation, minimum word count requirements, uniqueness checks against existing articles

### Risk: Generation Failures
**Mitigation**: Retry logic (3 attempts), email notifications on failure, manual retry via admin dashboard

### Trade-off: Cron vs BullMQ
Chose cron for simplicity. BullMQ would allow more sophisticated queuing but adds complexity.

## Migration Plan

1. **Database Migration**: Add new models via Prisma migration
2. **Seed Clusters**: Run script to create initial 1,000 article clusters
3. **Deploy AI Service**: Add aiService library with Azure configuration
4. **Deploy Admin UI**: Add admin dashboard routes
5. **Deploy Cron**: Create Kubernetes CronJob
6. **Monitor**: Watch generation logs and costs for first week

### Rollback
- Disable cron job
- Articles remain as drafts (not public)
- AI costs stop immediately

## Open Questions

1. **Content Review Process**: Should we batch review articles or review each individually?
   - *Recommendation*: Individual review for first 50, then batch for similar cluster types

2. **Image Generation**: Should we add AI-generated images later?
   - *Recommendation*: Phase 2 enhancement, not MVP

3. **Internal Linking Strategy**: How aggressively should we interlink articles?
   - *Recommendation*: 5-8 internal links per article, prioritize same cluster type
