# SQLite to PostgreSQL Migration Guide

This document outlines the steps to migrate data from SQLite to PostgreSQL using a custom Node.js migration script.

## Prerequisites

1. Node.js dependencies:

   ```bash
   npm install better-sqlite3 pg
   ```

2. Ensure PostgreSQL container is running:
   ```bash
   docker compose up db -d
   ```

## Migration Process

1. **Prepare Migration Script**
   The migration script (`migrate.js`) handles:

   - Proper table migration order based on foreign key dependencies
   - Data type conversions between SQLite and PostgreSQL
   - Timestamp normalization and validation
   - Boolean value conversions
   - Foreign key constraint validation

2. **Migration Order**
   Tables are migrated in the following order to respect dependencies:

   ```
   1. Independent tables:
      - Tag
      - User
      - SystemSettings

   2. User-dependent tables:
      - Account
      - Session
      - AutoScheduleSettings
      - ConnectedAccount

   3. Project and related tables:
      - Project
      - Task
      - _TagToTask

   4. Calendar-related tables:
      - CalendarFeed
      - CalendarEvent (with feed validation)

   5. Final tables:
      - OutlookTaskListMapping
      - VerificationToken
   ```

3. **Run Migration**
   ```bash
   node migrate.js
   ```

## Data Type Handling

### Timestamps

- All timestamp fields are normalized to ISO 8601 format
- Values are capped between Jan 1, 2000 and Dec 31, 2037
- Supported fields:
  ```
  - dueDate
  - scheduledStart/End
  - lastCompletedDate
  - createdAt/updatedAt
  - lastSyncedAt
  - start/end
  - created/lastModified
  - lastImported
  - expiresAt/expires
  - emailVerified
  - lastSync
  - channelExpiration
  ```

### Boolean Values

- SQLite boolean values are converted to PostgreSQL integers (0/1)
- Handles both boolean and string boolean ("true"/"false") values

### Foreign Keys

- Foreign key constraints are validated before insertion
- Parent records are ensured to exist before child records
- Special handling for CalendarEvent-CalendarFeed relationship

## Verification

After migration, verify the following row counts match the source database:

```sql
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

Expected row counts (example):

- CalendarEvent: ~1387 rows
- Task: ~167 rows
- Project: ~10 rows
- OutlookTaskListMapping: ~10 rows
- CalendarFeed: ~6 rows
- ConnectedAccount: ~2 rows
- SystemSettings: 1 row

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**

   - Check parent table records exist
   - Verify feedId references in CalendarEvent table
   - Ensure Project records exist for Tasks and OutlookTaskListMapping

2. **Timestamp Errors**

   - Check for out-of-range timestamps
   - Verify timestamp format in source data
   - Look for invalid date strings

3. **Connection Issues**
   - Verify PostgreSQL container is running
   - Check connection parameters in migrate.js
   - Ensure ports are correctly mapped

### Recovery Steps

If migration fails:

1. Truncate affected tables:
   ```sql
   TRUNCATE TABLE table_name CASCADE;
   ```
2. Check error messages in console output
3. Fix any data issues in source database
4. Retry migration

## Backup Plan

Before starting:

1. Backup SQLite database:
   ```bash
   cp data/dev.db data/dev.db.backup
   ```
2. Backup PostgreSQL database (if needed):
   ```bash
   pg_dump -h localhost -U fluid -d fluid_calendar > backup.sql
   ```

## Notes

- Migration script preserves referential integrity
- Handles data type conversions automatically
- Provides detailed error reporting
- Supports resuming failed migrations
- Maintains audit timestamps

## References

- [better-sqlite3 Documentation](https://github.com/JoshuaWise/better-sqlite3)
- [node-postgres Documentation](https://node-postgres.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLite Documentation](https://sqlite.org/docs.html)
