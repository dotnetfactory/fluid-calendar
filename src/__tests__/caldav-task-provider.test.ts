import { ConnectedAccount } from "@prisma/client";

import { CalDAVTaskProvider } from "@/lib/task-sync/providers/caldav-provider";
import { ExtendedDAVClient } from "@/lib/caldav-interfaces";

/**
 * Unit tests for the CalDAV task provider (GitHub issue #144). The provider
 * reads VTODO items from a CalDAV server for one-way import. We inject a fake
 * `ExtendedDAVClient` so the tests are pure (no network).
 */
function makeAccount(): ConnectedAccount {
  return {
    id: "acct-1",
    provider: "CALDAV",
    email: "user@example.com",
    caldavUrl: "https://dav.example.com",
    caldavUsername: "user",
    accessToken: "secret",
  } as unknown as ConnectedAccount;
}

function vtodoCalendarData(uid: string, summary: string): string {
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Test//EN\nBEGIN:VTODO\nUID:${uid}\nSUMMARY:${summary}\nEND:VTODO\nEND:VCALENDAR`;
}

describe("CalDAVTaskProvider.getTaskLists (issue #144)", () => {
  it("returns only collections whose components include VTODO", async () => {
    const fakeClient = {
      fetchCalendars: jest.fn().mockResolvedValue([
        {
          url: "https://dav.example.com/cal/events/",
          displayName: "Events",
          components: ["VEVENT"],
        },
        {
          url: "https://dav.example.com/cal/tasks/",
          displayName: "Tasks",
          components: ["VTODO"],
        },
        {
          // No components advertised -> excluded (cannot confirm VTODO support)
          url: "https://dav.example.com/cal/unknown/",
          displayName: "Unknown",
        },
      ]),
    } as unknown as ExtendedDAVClient;

    const provider = new CalDAVTaskProvider(makeAccount(), fakeClient);
    const lists = await provider.getTaskLists();

    expect(lists).toHaveLength(1);
    expect(lists[0].id).toBe("https://dav.example.com/cal/tasks/");
    expect(lists[0].name).toBe("Tasks");
  });
});

describe("CalDAVTaskProvider.getTasks (issue #144)", () => {
  it("returns one external task per valid VTODO, skipping UID-less ones", async () => {
    const fakeClient = {
      calendarQuery: jest.fn().mockResolvedValue([
        {
          href: "https://dav.example.com/cal/tasks/1.ics",
          props: {
            getetag: '"1"',
            "calendar-data": vtodoCalendarData("uid-1", "Buy milk"),
          },
        },
        {
          href: "https://dav.example.com/cal/tasks/2.ics",
          props: {
            getetag: '"2"',
            "calendar-data": vtodoCalendarData("uid-2", "Walk dog"),
          },
        },
        {
          href: "https://dav.example.com/cal/tasks/3.ics",
          props: {
            getetag: '"3"',
            // VTODO with no UID -> skipped
            "calendar-data":
              "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VTODO\nSUMMARY:Orphan\nEND:VTODO\nEND:VCALENDAR",
          },
        },
      ]),
    } as unknown as ExtendedDAVClient;

    const provider = new CalDAVTaskProvider(makeAccount(), fakeClient);
    const tasks = await provider.getTasks("https://dav.example.com/cal/tasks/");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id).sort()).toEqual(["uid-1", "uid-2"]);
    expect(tasks.every((t) => t.listId === "https://dav.example.com/cal/tasks/")).toBe(
      true
    );

    // The comp-filter targets VTODO, not VEVENT.
    const queryArg = (fakeClient.calendarQuery as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(queryArg)).toContain("VTODO");
    expect(JSON.stringify(queryArg)).not.toContain("VEVENT");
  });
});

describe("CalDAVTaskProvider write methods are unsupported (issue #144)", () => {
  const provider = new CalDAVTaskProvider(makeAccount(), {} as ExtendedDAVClient);

  it("createTask throws not-supported", async () => {
    await expect(
      provider.createTask("list", { title: "x" })
    ).rejects.toThrow(/not supported/i);
  });

  it("updateTask throws not-supported", async () => {
    await expect(
      provider.updateTask("list", "id", { title: "x" })
    ).rejects.toThrow(/not supported/i);
  });

  it("deleteTask throws not-supported", async () => {
    await expect(provider.deleteTask("list", "id")).rejects.toThrow(
      /not supported/i
    );
  });
});
