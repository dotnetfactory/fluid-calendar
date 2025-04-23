import { expect, test } from "@playwright/test";

import getGoogleEvent from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

// Helper function to get Test Calendar information
async function getTestCalendarInfo() {
  const feed = await prisma.calendarFeed.findFirst({
    where: {
      name: "Test Calendar",
      type: "GOOGLE",
    },
    include: {
      account: true,
    },
  });

  if (!feed || !feed.account || !feed.url) {
    throw new Error(
      "Test Calendar not found in database. Please ensure it is set up correctly."
    );
  }

  return {
    feed,
    feedId: feed.id,
    accountId: feed.account.id,
    userId: feed.account.userId,
    calendarId: feed.url,
    displayName: feed.name,
  };
}

// Helper function to verify event deletion with retries
async function verifyEventDeletion(
  accountId: string,
  userId: string,
  calendarId: string,
  eventId: string,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(
      `Attempt ${attempt}/${maxAttempts} to verify event deletion...`
    );
    try {
      const event = await getGoogleEvent(
        accountId,
        calendarId,
        eventId,
        userId
      );
      console.log(`Attempt ${attempt}: Event data:`, event);

      // Check if the event is marked as cancelled
      if (event.event.status === "cancelled") {
        console.log(
          "Event successfully verified as deleted (status: cancelled)"
        );
        return; // Success - event is marked as cancelled
      }

      if (attempt === maxAttempts) {
        throw new Error(
          "Event still exists in Google Calendar and is not cancelled after all retry attempts"
        );
      }

      // Wait with exponential backoff before next attempt
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // If we get a 404, that's also fine - means the event is fully deleted
      if (error.message.includes("Failed to sync Google Calendar event")) {
        console.log("Event successfully verified as deleted (404 Not Found)");
        return;
      }
      throw error; // Unexpected error
    }
  }
}

test.describe("Google Calendar Integration", () => {
  test("should create and delete an event in Google Calendar", async ({
    page,
  }) => {
    // Get Test Calendar information
    const testCalendar = await getTestCalendarInfo();
    console.log("Using Test Calendar:", testCalendar);

    // Navigate to the app (assuming already authenticated)
    await page.goto("/calendar");

    // Test data
    const eventTitle = `Test Event ${Date.now()}`;
    const eventDescription = "This is a test event created by Playwright";

    // Wait for calendar data to be loaded
    console.log("Waiting for Test Calendar to be loaded...");
    await page.waitForSelector(`text=${testCalendar.feed.name}`, {
      timeout: 10000,
    });
    console.log("Test Calendar found in feed list");

    // Click the create event button
    await page.click('[data-testid="create-event-button"]');

    // Wait for modal to be visible and fully loaded
    await page.waitForSelector('[data-testid="event-modal"]');

    // Wait a bit to ensure all calendar data is loaded in the modal
    await page.waitForTimeout(1000);

    // Fill in event details
    await page.fill('[data-testid="event-title-input"]', eventTitle);
    await page.fill(
      '[data-testid="event-description-input"]',
      eventDescription
    );

    // Wait for calendar dropdown to be populated
    const calendarSelect = page.locator('[data-testid="calendar-select"]');
    await calendarSelect.waitFor({ state: "visible" });

    // Select the calendar using its ID
    console.log("Selecting calendar by ID:", testCalendar.feedId);
    await page.selectOption('[data-testid="calendar-select"]', {
      value: testCalendar.feedId,
    });

    // Verify the selection worked
    const selectedText = await calendarSelect.evaluate(
      (select: HTMLSelectElement) =>
        select.options[select.selectedIndex]?.textContent
    );
    console.log("Selected calendar text:", selectedText);

    if (!selectedText?.includes(testCalendar.feed.name)) {
      throw new Error(
        `Calendar selection failed. Expected text containing "${testCalendar.feed.name}" but got "${selectedText}"`
      );
    }

    // Set to today's date
    const today = new Date();
    await page.fill(
      '[data-testid="event-start-date"]',
      formatToLocalISOString(today)
    );
    await page.fill(
      '[data-testid="event-end-date"]',
      formatToLocalISOString(new Date(today.getTime() + 3600000))
    ); // 1 hour later

    // Save the event
    await page.click('[data-testid="save-event-button"]');

    // Wait for modal to close
    await page.waitForSelector('[data-testid="event-modal"]', {
      state: "hidden",
    });

    // Verify the event exists in the calendar view
    const eventElement = page.locator(
      `[data-testid="calendar-event"]:has-text("${eventTitle}")`
    );
    await expect(eventElement).toBeVisible();

    // Get the event ID from the database
    const event = await prisma.calendarEvent.findFirst({
      where: {
        feedId: testCalendar.feedId,
        title: eventTitle,
      },
    });
    if (!event || !event.externalEventId) {
      throw new Error("Could not find event in database");
    }
    console.log("Created event:", event);

    // Verify event exists in Google Calendar API
    console.log("Verifying event in Google Calendar API...");
    const eventData = await getGoogleEvent(
      testCalendar.accountId,
      testCalendar.userId || "",
      testCalendar.calendarId,
      event.externalEventId
    );
    console.log("API Event Data:", eventData);

    // Verify event details match
    expect(eventData.event.summary).toBe(eventTitle);
    expect(eventData.event.description).toBe(eventDescription);

    // Click on the event to open it
    await eventElement.click();

    // Wait for event modal to open
    await page.waitForSelector('[data-testid="event-modal"]');

    // Click delete button
    await page.click('[data-testid="delete-event-button"]');

    // Wait for modal to close (no confirmation needed for non-recurring events)
    await page.waitForSelector('[data-testid="event-modal"]', {
      state: "hidden",
    });

    // Verify event is removed from view
    await expect(eventElement).not.toBeVisible();

    // Verify event is deleted from database
    const deletedEvent = await prisma.calendarEvent.findFirst({
      where: {
        feedId: testCalendar.feedId,
        title: eventTitle,
      },
    });
    expect(deletedEvent).toBeNull();

    // Verify event is deleted in Google Calendar API with retries
    console.log("Verifying event deletion in Google Calendar API...");
    await verifyEventDeletion(
      testCalendar.accountId,
      testCalendar.userId || "",
      testCalendar.calendarId,
      event.externalEventId
    );
  });

  test("should create and delete a recurring event series in Google Calendar", async ({
    page,
  }) => {
    // Get Test Calendar information
    const testCalendar = await getTestCalendarInfo();
    console.log("Using Test Calendar:", testCalendar);

    // Navigate to the app (assuming already authenticated)
    await page.goto("/calendar");

    // Test data
    const eventTitle = `Recurring Test Event ${Date.now()}`;
    const eventDescription =
      "This is a recurring test event created by Playwright";

    // Wait for calendar data to be loaded
    console.log("Waiting for Test Calendar to be loaded...");
    await page.waitForSelector(`text=${testCalendar.feed.name}`, {
      timeout: 10000,
    });
    console.log("Test Calendar found in feed list");

    // Click the create event button
    await page.click('[data-testid="create-event-button"]');

    // Wait for modal to be visible and fully loaded
    await page.waitForSelector('[data-testid="event-modal"]');

    // Wait a bit to ensure all calendar data is loaded in the modal
    await page.waitForTimeout(1000);

    // Fill in event details
    await page.fill('[data-testid="event-title-input"]', eventTitle);
    await page.fill(
      '[data-testid="event-description-input"]',
      eventDescription
    );

    // Wait for calendar dropdown to be populated
    const calendarSelect = page.locator('[data-testid="calendar-select"]');
    await calendarSelect.waitFor({ state: "visible" });

    // Select the calendar using its ID
    console.log("Selecting calendar by ID:", testCalendar.feedId);
    await page.selectOption('[data-testid="calendar-select"]', {
      value: testCalendar.feedId,
    });

    // Set to today's date
    const today = new Date();
    await page.fill(
      '[data-testid="event-start-date"]',
      formatToLocalISOString(today)
    );
    await page.fill(
      '[data-testid="event-end-date"]',
      formatToLocalISOString(new Date(today.getTime() + 3600000))
    ); // 1 hour later

    // Make it a recurring event
    console.log("Making event recurring...");
    await page.click('[data-testid="recurring-event-checkbox"]');

    // Wait for recurrence options to be visible
    console.log("Waiting for recurrence options...");
    await page.waitForSelector('[data-testid="recurrence-freq"]', {
      state: "visible",
      timeout: 5000,
    });

    // Set weekly recurrence
    console.log("Setting weekly recurrence...");
    await page.selectOption('[data-testid="recurrence-freq"]', "WEEKLY");

    // Save the event
    await page.click('[data-testid="save-event-button"]');

    // Wait for modal to close
    await page.waitForSelector('[data-testid="event-modal"]', {
      state: "hidden",
    });

    // Verify the event exists in the calendar view
    const eventElement = page.locator(
      `[data-testid="calendar-event"]:has-text("${eventTitle}")`
    );
    await expect(eventElement).toBeVisible();

    // Get the event ID from the database
    const event = await prisma.calendarEvent.findFirst({
      where: {
        feedId: testCalendar.feedId,
        title: eventTitle,
      },
    });
    if (!event || !event.externalEventId || !event.recurringEventId) {
      throw new Error("Could not find event in database");
    }
    console.log("Created event:", event);

    // Verify event exists in Google Calendar API
    console.log("Verifying event in Google Calendar API...");
    const eventData = await getGoogleEvent(
      testCalendar.accountId,
      testCalendar.userId || "",
      testCalendar.calendarId,
      event.externalEventId
    );
    console.log("API Event Data:", eventData);

    // Verify event details match
    expect(eventData.event.summary).toBe(eventTitle);
    expect(eventData.event.description).toBe(eventDescription);
    expect(eventData.event.recurrence?.[0]).toMatch(/^RRULE:.*FREQ=WEEKLY/);

    // Verify recurring event and its instances in database after Google sync
    console.log("Verifying recurring event and instances in database...");

    // Verify instances were created after sync
    const instances = await prisma.calendarEvent.findMany({
      where: {
        feedId: testCalendar.feedId,
        title: eventTitle,
        isMaster: false,
      },
    });
    expect(instances.length).toBeGreaterThan(0);
    console.log(`Found ${instances.length} instances of the recurring event`);

    // Click on the event to open it
    await eventElement.click();

    // Wait for event modal to open and handle the recurring event dialog
    await page.waitForSelector('[data-testid="edit-series-button"]');
    await page.click('[data-testid="edit-series-button"]');

    // Now the event modal should be fully open
    await page.waitForSelector('[data-testid="event-modal"]');

    // Click delete button
    await page.click('[data-testid="delete-event-button"]');

    // Wait for modal to close
    await page.waitForSelector('[data-testid="event-modal"]', {
      state: "hidden",
    });

    // Verify event is deleted from database
    const deletedEvent = await prisma.calendarEvent.findFirst({
      where: {
        feedId: testCalendar.feedId,
        title: eventTitle,
      },
    });
    expect(deletedEvent).toBeNull();

    // Verify event is deleted in Google Calendar API with retries
    console.log("Verifying event deletion in Google Calendar API...");
    await verifyEventDeletion(
      testCalendar.accountId,
      testCalendar.userId || "",
      testCalendar.calendarId,
      event.recurringEventId
    );
  });
});

// Helper function to format date for input
function formatToLocalISOString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
