# Database and Schema Troubleshooting Guide

This guide covers common database issues you might encounter when using Fluid Calendar and how to resolve them.

## Table of Contents

- [Database and Schema Troubleshooting Guide](#database-and-schema-troubleshooting-guide)
  - [Table of Contents](#table-of-contents)
  - [Migration Errors](#migration-errors)
    - [Modified Migration Files](#modified-migration-files)
      - [Error Message](#error-message)
      - [Cause](#cause)
      - [Solutions](#solutions)
    - [Missing Migration Files](#missing-migration-files)
      - [Error Message](#error-message-1)
      - [Cause](#cause-1)
      - [Solution](#solution)
    - [Invalid Migration History](#invalid-migration-history)
      - [Error Message](#error-message-2)
      - [Cause](#cause-2)
      - [Solution](#solution-1)
  - [Schema Synchronization Issues](#schema-synchronization-issues)
    - [Error: Database Schema Out of Sync](#error-database-schema-out-of-sync)
      - [Symptoms](#symptoms)
      - [Solution](#solution-2)
  - [Data Loss Prevention](#data-loss-prevention)
  - [Environment-Specific Solutions](#environment-specific-solutions)
    - [Development](#development)
    - [Staging/Testing](#stagingtesting)
    - [Production](#production)
  - [Advanced: Manual Database Intervention](#advanced-manual-database-intervention)
  - [Community Help](#community-help)

## Migration Errors

### Modified Migration Files

#### Error Message

```
The migration '20250309034054_update_waitlist_entries' was modified after it was applied.
? We need to reset the "public" schema at "localhost:5432"
Do you want to continue? All data will be lost. (y/N)
```

#### Cause

This error occurs when a migration file that has already been applied to your database has been modified. This can happen when:

- You pulled changes from the repository where someone modified existing migration files
- You manually edited migration files after they were applied
- You switched branches with different migration histories

#### Solutions

**Option 1: Development Environment (Data loss acceptable)**

If you're in a development environment and can afford to lose data:

```bash
# WARNING: This will delete all data in the database
npx prisma migrate reset
```

This will:

- Drop the database schema
- Create a new schema
- Apply all migrations from scratch
- Run seed script if configured

**Option 2: Production Environment (Preserve data)**

If you need to preserve your data:

1. Create a database backup first:

   ```bash
   pg_dump -U username -d database_name > backup.sql
   ```

2. Fix the migration history without modifying data:

   ```bash
   npx prisma migrate resolve --applied 20250309034054_update_waitlist_entries
   ```

3. If you've made changes to your Prisma schema that aren't reflected in migrations:
   ```bash
   # Generate a new migration for any pending schema changes
   npx prisma migrate dev --name fix_schema
   ```

**Option 3: Investigate Migration Status**

Check the current state of your migrations:

```bash
npx prisma migrate status
```

This will show which migrations have been applied and which ones are pending or have issues.

### Missing Migration Files

#### Error Message

```
Error: P3005: The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

#### Cause

This happens when your database has tables but Prisma doesn't recognize any migrations as having been applied.

#### Solution

Initialize Prisma with your existing database schema:

```bash
# Create a baseline migration
npx prisma migrate diff --from-empty --to-schema-datamodel=prisma/schema.prisma --script > prisma/migrations/initial/migration.sql

# Mark it as applied
npx prisma migrate resolve --applied initial
```

### Invalid Migration History

#### Error Message

```
Error: P3014: The migration `20250309034054_update_waitlist_entries` failed.
```

#### Cause

A migration was incompletely applied or failed during execution.

#### Solution

1. Check migration errors in the output
2. Fix any issues in your database schema
3. Then use the resolve command to mark it:

```bash
# Depending on if you need to apply or skip this migration:
npx prisma migrate resolve --applied 20250309034054_update_waitlist_entries
# OR
npx prisma migrate resolve --rolled-back 20250309034054_update_waitlist_entries
```

## Schema Synchronization Issues

### Error: Database Schema Out of Sync

#### Symptoms

- Features not working correctly
- Database queries failing
- Missing columns or tables

#### Solution

1. Generate a schema drift report:

   ```bash
   npx prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma
   ```

2. Apply necessary changes:

   ```bash
   # For development
   npx prisma migrate dev --name sync_schema

   # For production (after testing in staging)
   npx prisma migrate deploy
   ```

## Data Loss Prevention

To prevent data loss when updating your database schema:

1. **Always back up before major changes**:

   ```bash
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d).sql
   ```

2. **Use safe migration patterns**:

   - Add nullable columns first, then add data, then add constraints
   - Use multiple migrations for complex changes
   - Test migrations on a copy of production data

3. **Never modify existing migration files**:
   - Create new migrations instead of changing existing ones
   - Use `--create-only` to review migrations before applying them:
   ```bash
   npx prisma migrate dev --name change_description --create-only
   # Review the generated migration file
   npx prisma migrate dev
   ```

## Environment-Specific Solutions

### Development

Prioritize rapid iteration:

```bash
# Quick schema push (caution: can cause data loss)
npx prisma db push

# Or for more safety with migration tracking
npx prisma migrate dev
```

### Staging/Testing

Simulate production upgrades:

```bash
# Apply migrations as production would
npx prisma migrate deploy
```

### Production

Controlled, safe updates:

```bash
# Deploy migrations in production
npx prisma migrate deploy

# In case of issues, restore from backup
psql -U username -d database_name -f backup.sql
```

## Advanced: Manual Database Intervention

Sometimes you may need to directly modify the Prisma migration tables:

```sql
-- View migration history
SELECT * FROM _prisma_migrations ORDER BY applied_at;

-- Mark a migration as applied
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES ('uuid-value', 'checksum-value', NOW(), '20250309034054_update_waitlist_entries', '', NULL, NOW(), 1);

-- Remove a migration record
DELETE FROM _prisma_migrations WHERE migration_name = '20250309034054_update_waitlist_entries';
```

**Note**: Direct database manipulation should be a last resort. Use Prisma commands when possible.

## Community Help

If you continue to experience issues, please:

1. Check our [GitHub issues](https://github.com/dotnetfactory/fluid-calendar/issues) for similar problems
2. Provide detailed information when reporting issues:
   - Your Prisma version (`npx prisma -v`)
   - The exact error message
   - Steps to reproduce the issue
   - Any environment-specific details

```

```
