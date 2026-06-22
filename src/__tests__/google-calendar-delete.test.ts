import { calendar_v3 } from "googleapis";

import { deleteGoogleEvent } from "@/lib/google-calendar";

type Calendar = calendar_v3.Calendar;

/**
 * Builds a fake Google Calendar client whose `events.get` returns the supplied
 * event data, and whose `delete`/`instances` are jest mocks we can assert on.
 */
function makeFakeCalendar(getData: calendar_v3.Schema$Event) {
  const get = jest.fn().mockResolvedValue({ data: getData });
  const del = jest.fn().mockResolvedValue({ data: {} });
  const instances = jest
    .fn()
    .mockResolvedValue({ data: { items: [{ id: "WRONG_NEXT_INSTANCE" }] } });

  const calendar = {
    events: { get, delete: del, instances },
  } as unknown as Calendar;

  return { calendar, get, del, instances };
}

describe("deleteGoogleEvent - single occurrence targets the clicked instance", () => {
  const accountId = "acc";
  const userId = "user";
  const calendarId = "cal";

  it("single mode deletes the provided (clicked) recurring instance id, not the next upcoming one", async () => {
    const clickedId = "master123_20260601T090000Z";
    const { calendar, del, instances } = makeFakeCalendar({
      id: clickedId,
      recurringEventId: "master123",
    });

    await deleteGoogleEvent(
      accountId,
      userId,
      calendarId,
      clickedId,
      "single",
      async () => calendar
    );

    // It must delete exactly the clicked instance id...
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith({ calendarId, eventId: clickedId });
    // ...and must NOT re-query for the "next upcoming" instance.
    expect(instances).not.toHaveBeenCalled();
  });

  it("single mode does not delete a future occurrence when a past one is clicked", async () => {
    const clickedPastId = "master123_20250101T090000Z";
    const { calendar, del } = makeFakeCalendar({
      id: clickedPastId,
      recurringEventId: "master123",
    });

    await deleteGoogleEvent(
      accountId,
      userId,
      calendarId,
      clickedPastId,
      "single",
      async () => calendar
    );

    expect(del).toHaveBeenCalledWith({ calendarId, eventId: clickedPastId });
    expect(del).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "WRONG_NEXT_INSTANCE" })
    );
  });

  it("single mode deletes a non-recurring event id directly without an instances lookup", async () => {
    const eventId = "plain-block-event";
    const { calendar, del, instances } = makeFakeCalendar({ id: eventId });

    await deleteGoogleEvent(
      accountId,
      userId,
      calendarId,
      eventId,
      "single",
      async () => calendar
    );

    expect(del).toHaveBeenCalledWith({ calendarId, eventId });
    expect(instances).not.toHaveBeenCalled();
  });

  it("single mode refuses to delete a recurring master id (would erase the whole series)", async () => {
    // A true master: has recurrence, but no recurringEventId.
    const masterId = "master123";
    const { calendar, del } = makeFakeCalendar({
      id: masterId,
      recurrence: ["RRULE:FREQ=WEEKLY"],
    });

    await expect(
      deleteGoogleEvent(
        accountId,
        userId,
        calendarId,
        masterId,
        "single",
        async () => calendar
      )
    ).rejects.toThrow();

    // Must NOT delete the master id in single mode.
    expect(del).not.toHaveBeenCalled();
  });

  it("an invalid/unknown mode does not bypass the master guard (no series wipe)", async () => {
    // The DELETE route forwards `mode` from request JSON untyped, so a malformed
    // request could send something that is neither "single" nor "series".
    const masterId = "master123";
    const { calendar, del } = makeFakeCalendar({
      id: masterId,
      recurrence: ["RRULE:FREQ=WEEKLY"],
    });

    await expect(
      deleteGoogleEvent(
        accountId,
        userId,
        calendarId,
        masterId,
        // Simulate an invalid mode coming off the wire.
        "this" as unknown as "single" | "series",
        async () => calendar
      )
    ).rejects.toThrow();

    expect(del).not.toHaveBeenCalled();
  });

  it("series mode deletes the master recurring event", async () => {
    const clickedId = "master123_20260601T090000Z";
    const { calendar, del } = makeFakeCalendar({
      id: clickedId,
      recurringEventId: "master123",
    });

    await deleteGoogleEvent(
      accountId,
      userId,
      calendarId,
      clickedId,
      "series",
      async () => calendar
    );

    expect(del).toHaveBeenCalledWith({ calendarId, eventId: "master123" });
  });
});
