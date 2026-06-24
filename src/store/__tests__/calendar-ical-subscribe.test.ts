/**
 * Proves subscribing to an iCal (ICAL) URL is atomic (#4): if the first sync
 * fails (unreachable/private/invalid URL, unparseable body), `addFeed` must
 * roll the just-created feed back and reject, leaving no broken feed behind -
 * rather than silently persisting a feed whose only state is an error.
 */
import { useCalendarStore } from "@/store/calendar";

// The store triggers auto-scheduling after a sync; stub it so the test does not
// reach the real task store / network.
jest.mock("@/store/task", () => ({
  useTaskStore: {
    getState: () => ({ triggerScheduleAllTasks: jest.fn().mockResolvedValue(undefined) }),
  },
}));

type FetchArgs = { url: string; method: string };

function resetStore() {
  useCalendarStore.setState({ feeds: [], events: [] } as never);
}

describe("addFeed (ICAL) atomic subscribe", () => {
  const calls: FetchArgs[] = [];

  beforeEach(() => {
    calls.length = 0;
    resetStore();

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method });

      // Create the feed row.
      if (url === "/api/feeds" && method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }
      // The initial iCal sync fails (e.g. private/unreachable URL).
      if (url.endsWith("/ical-sync") && method === "PUT") {
        return {
          ok: false,
          status: 502,
          json: async () => ({ error: "Refusing to fetch private address" }),
        } as Response;
      }
      // Rollback delete.
      if (url.startsWith("/api/feeds/") && method === "DELETE") {
        return { ok: true, json: async () => ({}) } as Response;
      }
      // loadFromDatabase reload after a (failed) sync.
      if (url === "/api/feeds" && method === "GET") {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url === "/api/calendar" && method === "GET") {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;
  });

  it("rolls back the feed and rejects when the first sync fails", async () => {
    const { addFeed } = useCalendarStore.getState();

    await expect(
      addFeed("Bad Feed", "https://attacker.example/private.ics", "ICAL", "#fff")
    ).rejects.toThrow(/private address/i);

    // The feed must not survive a failed initial sync.
    expect(useCalendarStore.getState().feeds).toHaveLength(0);

    // A rollback DELETE was issued for the created feed.
    const deleted = calls.find(
      (c) => c.method === "DELETE" && c.url.startsWith("/api/feeds/")
    );
    expect(deleted).toBeDefined();
  });
});
