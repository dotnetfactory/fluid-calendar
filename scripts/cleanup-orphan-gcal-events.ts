/**
 * One-off: list all events on the Fluid task calendar in GCal, diff against
 * Task.gcalEventId, and delete any GCal event that FC no longer tracks.
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphan-gcal-events.ts          # dry-run
 *   npx tsx scripts/cleanup-orphan-gcal-events.ts --execute # actually delete
 */
import { prisma } from "@/lib/prisma";
import { getGoogleCalendarClient } from "@/lib/google-calendar";

const CALENDAR_NAME = "Fluid";

async function main() {
  const execute = process.argv.includes("--execute");
  console.log(`Mode: ${execute ? "EXECUTE (will delete)" : "DRY-RUN"}`);

  const feed = await prisma.calendarFeed.findFirst({
    where: { name: CALENDAR_NAME, type: "GOOGLE" },
  });
  if (!feed?.url || !feed.accountId || !feed.userId) {
    throw new Error(`No Fluid GCal feed with account/user/url`);
  }
  const calendarId = feed.url;
  console.log(`Target calendar: ${calendarId}`);

  const tracked = new Set<string>(
    (
      await prisma.task.findMany({
        where: { gcalEventId: { not: null }, userId: feed.userId },
        select: { gcalEventId: true },
      })
    ).map((t) => t.gcalEventId!)
  );
  console.log(`FC-tracked events: ${tracked.size}`);

  const calendar = await getGoogleCalendarClient(feed.accountId, feed.userId);

  const allEvents: { id: string; summary: string; start?: string }[] = [];
  let pageToken: string | undefined;
  do {
    const resp = await calendar.events.list({
      calendarId,
      maxResults: 2500,
      singleEvents: false,
      showDeleted: false,
      pageToken,
    });
    for (const ev of resp.data.items || []) {
      if (!ev.id) continue;
      allEvents.push({
        id: ev.id,
        summary: ev.summary || "(no title)",
        start: ev.start?.dateTime || ev.start?.date || undefined,
      });
    }
    pageToken = resp.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`Events on Fluid calendar: ${allEvents.length}`);

  const orphans = allEvents.filter((ev) => !tracked.has(ev.id));
  console.log(`Orphans (not in FC): ${orphans.length}`);

  if (orphans.length > 0) {
    console.log("\nFirst 10 orphans:");
    for (const ev of orphans.slice(0, 10)) {
      console.log(`  ${ev.start || "(no start)"}  ${ev.summary}  [${ev.id}]`);
    }
  }

  if (!execute) {
    console.log("\nDry-run complete. Re-run with --execute to delete orphans.");
    return;
  }

  let deleted = 0;
  let failed = 0;
  for (const ev of orphans) {
    try {
      await calendar.events.delete({ calendarId, eventId: ev.id });
      deleted++;
      if (deleted % 25 === 0) console.log(`  deleted ${deleted}/${orphans.length}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${ev.id}: ${(err as Error).message}`);
    }
  }
  console.log(`\nDone. Deleted: ${deleted}. Failed: ${failed}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
