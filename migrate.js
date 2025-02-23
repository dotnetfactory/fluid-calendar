const Database = require("better-sqlite3");
const { Pool } = require("pg");

const db = new Database("./data/dev.db");
const pool = new Pool({
  user: "fluid",
  host: "localhost",
  database: "fluid_calendar",
  password: "fluid",
  port: 5432,
});

// Helper function to convert SQLite timestamps to PostgreSQL timestamps
function convertValue(value, columnName) {
  if (value === null) {
    return null;
  }

  // Handle boolean values
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  // Handle string booleans
  if (value === "true" || value === "false") {
    return value === "true" ? 1 : 0;
  }

  // Handle timestamp fields
  const timestampFields = [
    "dueDate",
    "scheduledStart",
    "scheduledEnd",
    "lastCompletedDate",
    "createdAt",
    "updatedAt",
    "lastSyncedAt",
    "start",
    "end",
    "created",
    "lastModified",
    "lastImported",
    "expiresAt",
    "expires",
    "emailVerified",
    "lastSync",
    "channelExpiration",
  ];

  if (timestampFields.includes(columnName)) {
    try {
      let timestamp = value;
      if (typeof timestamp === "string") {
        timestamp = new Date(timestamp).getTime();
      }
      if (typeof timestamp === "number") {
        // Convert seconds to milliseconds if needed
        if (timestamp < 1e12) {
          timestamp *= 1000;
        }
        // Cap timestamps to a safe range
        const minDate = new Date("2000-01-01T00:00:00.000Z").getTime();
        const maxDate = new Date("2037-12-31T23:59:59.999Z").getTime();
        timestamp = Math.min(Math.max(timestamp, minDate), maxDate);
        return new Date(timestamp).toISOString();
      }
    } catch (error) {
      console.error(`Error converting timestamp for ${columnName}:`, error);
      return new Date("2000-01-01T00:00:00.000Z").toISOString();
    }
  }

  return value;
}

async function insertRow(client, tableName, columns, values) {
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const query = `
    INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(", ")})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;

  try {
    await client.query(query, values);
    return true;
  } catch (error) {
    console.error(`Error inserting row in ${tableName}:`, error.message);
    console.error(
      "Problematic row:",
      JSON.stringify(
        Object.fromEntries(columns.map((col, i) => [col, values[i]])),
        null,
        2
      )
    );
    console.error("Converted values:", values);
    return false;
  }
}

async function migrateTable(client, tableName, query = null) {
  console.log(`Migrating table: ${tableName}`);

  const sqliteRows = await db
    .prepare(query || `SELECT * FROM "${tableName}"`)
    .all();

  if (sqliteRows.length === 0) {
    console.log(`No data in table ${tableName}`);
    return;
  }

  let successCount = 0;
  const columns = Object.keys(sqliteRows[0]);

  for (const row of sqliteRows) {
    const values = columns.map((column) => convertValue(row[column], column));
    if (await insertRow(client, tableName, columns, values)) {
      successCount++;
    }
  }

  console.log(
    `Successfully migrated ${successCount} out of ${sqliteRows.length} rows from ${tableName}`
  );
}

async function ensureCalendarFeedExists(client, feedId) {
  // Check if feed exists in SQLite
  const feed = db
    .prepare('SELECT * FROM "CalendarFeed" WHERE id = ?')
    .get(feedId);
  if (!feed) {
    console.log(`Feed ${feedId} not found in SQLite database`);
    return false;
  }

  // Insert feed into PostgreSQL if it doesn't exist
  const columns = Object.keys(feed);
  const values = columns.map((column) => convertValue(feed[column], column));
  return await insertRow(client, "CalendarFeed", columns, values);
}

async function migrate() {
  const client = await pool.connect();
  try {
    // Start with independent tables
    await migrateTable(client, "Tag");
    await migrateTable(client, "User");
    await migrateTable(client, "SystemSettings");

    // Migrate tables that depend on User
    await migrateTable(client, "Account");
    await migrateTable(client, "Session");
    await migrateTable(client, "AutoScheduleSettings");
    await migrateTable(client, "ConnectedAccount");

    // Migrate Project before Task and OutlookTaskListMapping
    await migrateTable(client, "Project");

    // Migrate Task and its relationships
    await migrateTable(client, "Task");
    await migrateTable(client, "_TagToTask");

    // Migrate CalendarFeed before CalendarEvent
    await migrateTable(client, "CalendarFeed");

    // For CalendarEvent, ensure feeds exist before inserting events
    const events = db.prepare('SELECT * FROM "CalendarEvent"').all();
    let successCount = 0;

    for (const event of events) {
      // Ensure feed exists
      if (
        event.feedId &&
        !(await ensureCalendarFeedExists(client, event.feedId))
      ) {
        console.log(
          `Skipping event ${event.id} due to missing feed ${event.feedId}`
        );
        continue;
      }

      const columns = Object.keys(event);
      const values = columns.map((column) =>
        convertValue(event[column], column)
      );
      if (await insertRow(client, "CalendarEvent", columns, values)) {
        successCount++;
      }
    }
    console.log(
      `Successfully migrated ${successCount} out of ${events.length} rows from CalendarEvent`
    );

    // Migrate OutlookTaskListMapping last since it depends on Project
    await migrateTable(client, "OutlookTaskListMapping");
    await migrateTable(client, "VerificationToken");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
    await db.close();
  }
}

migrate().catch(console.error);
