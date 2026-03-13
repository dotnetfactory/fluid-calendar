## ADDED Requirements

### Requirement: AI Service with Call Tracking
The system SHALL provide a centralized AI service that routes all AI calls through a single interface and logs each call to the database.

#### Scenario: AI call is logged
- **WHEN** an AI content generation request is made
- **THEN** the system creates an AICallLog record with start time, model, and prompt
- **AND** updates the record with end time, duration, tokens, and cost upon completion

#### Scenario: AI call failure is logged
- **WHEN** an AI call fails
- **THEN** the system updates the AICallLog record with error message
- **AND** the error is propagated to the caller

### Requirement: Article Cluster Management
The system SHALL organize SEO content into clusters, each targeting specific keywords and topics with priority-based generation queuing.

#### Scenario: Cluster is created
- **WHEN** the seed script runs
- **THEN** article clusters are created with clusterType, parameters, slug, title, metaDescription, and priorityScore
- **AND** clusters are set to "pending" status

#### Scenario: Cluster priority ordering
- **WHEN** the cron job selects the next cluster to generate
- **THEN** the system selects the pending cluster with the highest priorityScore
- **AND** clusters with the same score are ordered by creation date (oldest first)

### Requirement: Automated Article Generation
The system SHALL generate articles automatically via a cron-triggered endpoint that processes one cluster at a time.

#### Scenario: Cron triggers generation
- **WHEN** the cron endpoint receives a valid request with correct x-cron-secret header
- **THEN** the system selects the highest priority pending cluster
- **AND** updates the cluster status to "generating"
- **AND** returns immediately with cluster info while generation continues asynchronously

#### Scenario: Generation succeeds
- **WHEN** AI content generation completes successfully
- **THEN** the system creates an Article record with the generated content
- **AND** updates the cluster status to "published" or "needs_review" based on quality validation
- **AND** creates an ArticleGenerationLog record with success status
- **AND** sends an email notification to the admin

#### Scenario: Generation fails
- **WHEN** AI content generation fails after all retry attempts
- **THEN** the system updates the cluster status to "failed"
- **AND** stores the error message in the cluster
- **AND** creates an ArticleGenerationLog record with failure status
- **AND** sends an email notification to the admin

### Requirement: Content Quality Validation
The system SHALL validate generated content for quality before publishing automatically.

#### Scenario: Content passes validation
- **WHEN** generated content has at least 1,500 words
- **AND** contains proper HTML structure (h2, p tags)
- **AND** contains FluidCalendar brand mentions
- **AND** has no placeholder text
- **THEN** the article is marked as "published" if all checks pass

#### Scenario: Content fails validation
- **WHEN** generated content fails any quality check
- **THEN** the article is marked as "needs_review"
- **AND** validation issues are logged in the generation log

#### Scenario: Duplicate content detection
- **WHEN** generated content hash matches an existing article
- **THEN** the system flags the content as duplicate
- **AND** marks the article as "needs_review"

### Requirement: Admin Dashboard for Articles
The system SHALL provide an admin-only dashboard for managing article clusters and reviewing content.

#### Scenario: Admin views article list
- **WHEN** an admin user navigates to /admin/articles
- **THEN** the system displays a filterable list of article clusters
- **AND** shows statistics (total, by status, cost, tokens)

#### Scenario: Admin filters articles
- **WHEN** an admin selects filter options (status, cluster type)
- **THEN** the list updates to show only matching clusters

#### Scenario: Admin manually triggers generation
- **WHEN** an admin clicks "Generate" on a pending cluster
- **THEN** the system triggers generation for that specific cluster
- **AND** updates the UI to show generating status

#### Scenario: Admin publishes draft article
- **WHEN** an admin reviews and approves a draft article
- **AND** clicks "Publish"
- **THEN** the article status changes to published
- **AND** the article becomes visible on the public site

#### Scenario: Admin skips cluster
- **WHEN** an admin clicks "Skip" on a cluster
- **THEN** the cluster status changes to "skipped"
- **AND** the cluster is excluded from automated generation

#### Scenario: Non-admin access denied
- **WHEN** a non-admin user attempts to access /admin/articles
- **THEN** the system redirects to the dashboard or returns 403

### Requirement: Public Article Display
The system SHALL display published articles at public URLs for SEO indexing.

#### Scenario: Published article is accessible
- **WHEN** a user navigates to /learn/[slug]
- **AND** an article with that slug exists and is published
- **THEN** the system renders the article with title, content, and metadata

#### Scenario: Unpublished article returns 404
- **WHEN** a user navigates to /learn/[slug]
- **AND** the article is not published or does not exist
- **THEN** the system returns a 404 page

#### Scenario: Article has proper SEO metadata
- **WHEN** a published article page is rendered
- **THEN** the page includes title, meta description, Open Graph tags
- **AND** includes Article structured data (JSON-LD)

### Requirement: Dynamic Sitemap
The system SHALL include all published articles in the sitemap for search engine indexing.

#### Scenario: Sitemap includes articles
- **WHEN** the sitemap.xml is requested
- **THEN** the response includes all published articles under /learn/[slug]
- **AND** each entry has appropriate changeFrequency and priority

#### Scenario: Sitemap excludes unpublished
- **WHEN** the sitemap.xml is requested
- **THEN** articles with status other than "published" are not included

### Requirement: Admin Email Notifications
The system SHALL send email notifications to admins when article generation completes.

#### Scenario: Success notification sent
- **WHEN** article generation completes successfully
- **THEN** an email is sent to ADMIN_EMAIL
- **AND** includes article title, slug, status, word count, duration
- **AND** includes cluster queue statistics

#### Scenario: Failure notification sent
- **WHEN** article generation fails
- **THEN** an email is sent to ADMIN_EMAIL
- **AND** includes article title, slug, error message
- **AND** includes cluster queue statistics

### Requirement: Cron Authentication
The system SHALL authenticate cron requests using a shared secret.

#### Scenario: Valid cron secret accepted
- **WHEN** a request to /api/cron/generate-article includes valid x-cron-secret header
- **THEN** the request is processed

#### Scenario: Invalid cron secret rejected
- **WHEN** a request to /api/cron/generate-article has missing or invalid x-cron-secret
- **THEN** the system returns 401 Unauthorized

### Requirement: Internal Linking
The system SHALL include internal links to related articles within generated content.

#### Scenario: Related articles linked
- **WHEN** content is generated
- **THEN** the content includes links to 5-8 related published articles
- **AND** related articles are selected based on cluster type and parameters
