import { ConnectedAccount } from "@prisma/client";
import ICAL from "ical.js";
import { DAVDepth, DAVResponse, createDAVClient } from "tsdav";

import { convertVTodoToTask } from "@/lib/caldav-helpers";
import {
  CalendarQueryParams,
  ExtendedDAVClient,
} from "@/lib/caldav-interfaces";
import { logger } from "@/lib/logger";

import { Priority, Task, TaskStatus } from "@/types/task";

import {
  ExternalTask,
  ExternalTaskList,
  SyncOptions,
  TaskChange,
  TaskProviderInterface,
  TaskToCreate,
  TaskUpdates,
} from "./task-provider.interface";

const LOG_SOURCE = "CalDAVTaskProvider";

const WRITE_NOT_SUPPORTED =
  "CalDAV task write-back is not supported (import is one-way)";

/**
 * Task provider implementation for CalDAV servers (GitHub issue #144).
 *
 * CalDAV servers expose tasks as iCalendar `VTODO` components inside calendar
 * collections that advertise `VTODO` in their supported component set. This
 * provider reads those collections and their `VTODO` items for one-way import
 * into FluidCalendar, reusing the same `tsdav` client and `ical.js` parsing the
 * calendar-event sync uses.
 *
 * Write-back (creating/updating/deleting `VTODO` on the server) is intentionally
 * unsupported for now: the write methods throw so the unsupported direction is
 * explicit rather than silently no-op. Bidirectional CalDAV task sync is a
 * future change.
 */
export class CalDAVTaskProvider implements TaskProviderInterface {
  private client: ExtendedDAVClient | null;

  /**
   * @param account The connected CalDAV account (URL, username, password).
   * @param client Optional pre-built client; primarily for testing. When
   *   omitted, a `tsdav` client is created lazily from the account credentials.
   */
  constructor(
    private account: ConnectedAccount,
    client?: ExtendedDAVClient
  ) {
    this.client = client ?? null;
  }

  getType(): string {
    return "CALDAV";
  }

  getName(): string {
    return "CalDAV Tasks";
  }

  /**
   * CalDAV task import is one-way: this provider does not push local changes
   * back to the server, so the sync engine runs an incoming-only path.
   */
  supportsWriteBack(): boolean {
    return false;
  }

  /**
   * Creates and caches the CalDAV client, mirroring the calendar service's
   * Basic-auth setup (the account's access token is used as the password).
   */
  private async getClient(): Promise<ExtendedDAVClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.account.caldavUrl) {
      throw new Error("CalDAV URL is required");
    }

    this.client = (await createDAVClient({
      serverUrl: this.account.caldavUrl,
      credentials: {
        username: this.account.caldavUsername || this.account.email,
        password: this.account.accessToken,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    })) as unknown as ExtendedDAVClient;

    return this.client;
  }

  /**
   * Lists the account's task collections: calendars whose advertised component
   * set includes `VTODO`. A collection that does not advertise `VTODO` cannot
   * hold tasks and is excluded.
   */
  async getTaskLists(): Promise<ExternalTaskList[]> {
    const client = await this.getClient();
    const calendars = await client.fetchCalendars();

    return calendars
      .filter((cal) =>
        (cal.components ?? []).some((c) => c.toUpperCase() === "VTODO")
      )
      .map((cal) => {
        const displayName =
          typeof cal.displayName === "string" ? cal.displayName : undefined;
        return {
          id: cal.url,
          name: displayName || cal.url,
          path: cal.url,
          color:
            typeof cal.calendarColor === "string"
              ? cal.calendarColor
              : undefined,
        };
      });
  }

  /**
   * Reads all `VTODO` items from a task collection and maps them to external
   * tasks. The whole collection is read each sync (no delta), matching the
   * Google Tasks provider; tasks are not time-bounded, so no `time-range`
   * filter is applied.
   *
   * @param listId The CalDAV URL of the task collection.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTasks(listId: string, options?: SyncOptions): Promise<ExternalTask[]> {
    const client = await this.getClient();
    const responses = await client.calendarQuery(
      this.createVTodoQueryParams(listId)
    );

    const tasks: ExternalTask[] = [];
    const seenUids = new Set<string>();

    for (const obj of responses) {
      const icalData = this.extractICalData(obj);
      if (!icalData) continue;

      let vtodos: ICAL.Component[];
      try {
        const jcal = ICAL.parse(icalData);
        const vcalendar = new ICAL.Component(jcal);
        vtodos = vcalendar.getAllSubcomponents("vtodo");
      } catch (error) {
        logger.warn(
          "Failed to parse CalDAV task object",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            url: obj.href || "unknown",
          },
          LOG_SOURCE
        );
        continue;
      }

      for (const vtodo of vtodos) {
        const task = convertVTodoToTask(vtodo);
        if (!task) continue; // UID-less or unparseable VTODO; skip.
        if (seenUids.has(task.id)) continue; // De-dupe by UID.
        seenUids.add(task.id);
        tasks.push({ ...task, listId });
      }
    }

    return tasks;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createTask(listId: string, task: TaskToCreate): Promise<ExternalTask> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  async updateTask(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    listId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    taskId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updates: TaskUpdates
  ): Promise<ExternalTask> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteTask(listId: string, taskId: string): Promise<void> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  /**
   * Reports externally-modified tasks since `since`, derived from the full read
   * (CalDAV has no cheap delta here). Mirrors the Google provider's approach.
   */
  async getChanges(listId: string, since?: Date): Promise<TaskChange[]> {
    const tasks = await this.getTasks(listId);
    const changes: TaskChange[] = [];

    if (since) {
      for (const t of tasks) {
        if (t.lastModified && t.lastModified > since) {
          changes.push({
            id: `change-${t.id}-${Date.now()}`,
            taskId: t.id,
            listId,
            type: "UPDATE",
            timestamp: t.lastModified,
            changes: { task: t },
          });
        }
      }
    }

    return changes;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getTaskLists();
      return true;
    } catch (error) {
      logger.error(
        "Failed to validate CalDAV task connection",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return false;
    }
  }

  mapToInternalTask(
    externalTask: ExternalTask,
    projectId: string
  ): Partial<Task> {
    return {
      title: externalTask.title,
      description: externalTask.description || null,
      status: this.mapStatusFromVTodo(externalTask.status),
      priority: this.mapPriorityFromVTodo(externalTask.priority),
      projectId,
      dueDate: externalTask.dueDate || null,
      startDate: externalTask.startDate || null,
      completedAt: externalTask.completedDate || null,
      isRecurring: externalTask.isRecurring || false,
      recurrenceRule: externalTask.recurrenceRule || null,
      source: this.getType(),
      isAutoScheduled: false,
      scheduleLocked: false,
      tags: [],
      project: null,
      energyLevel: null,
      preferredTime: null,
    };
  }

  mapToExternalTask(task: Partial<Task>): TaskToCreate {
    // Only used by the (unsupported) write path; provide a minimal mapping.
    return {
      title: task.title || "Untitled Task",
      description: task.description || null,
      status: task.status || null,
      priority: task.priority || null,
      dueDate: task.dueDate || null,
      startDate: task.startDate || null,
      recurrenceRule: task.recurrenceRule || null,
    };
  }

  /**
   * Maps a VTODO `STATUS` to a FluidCalendar `TaskStatus`. `COMPLETED` maps to
   * completed; `IN-PROCESS` to in-progress; everything else (`NEEDS-ACTION`,
   * `CANCELLED`, absent) to todo.
   */
  private mapStatusFromVTodo(status?: string): TaskStatus {
    switch ((status || "").toUpperCase()) {
      case "COMPLETED":
        return TaskStatus.COMPLETED;
      case "IN-PROCESS":
        return TaskStatus.IN_PROGRESS;
      default:
        return TaskStatus.TODO;
    }
  }

  /**
   * Maps a VTODO `PRIORITY` (0-9, where 1 is highest and 0 is undefined per RFC
   * 5545) into FluidCalendar's high/medium/low buckets.
   */
  private mapPriorityFromVTodo(priority?: string): Priority {
    if (priority === undefined) return Priority.NONE;
    const n = parseInt(priority, 10);
    if (isNaN(n) || n === 0) return Priority.NONE;
    if (n <= 4) return Priority.HIGH;
    if (n === 5) return Priority.MEDIUM;
    return Priority.LOW;
  }

  /**
   * Builds a calendar-query targeting `VTODO` components in a collection. The
   * shape mirrors the calendar service's VEVENT query but swaps the inner
   * comp-filter to `VTODO` and omits the time-range so undated tasks are kept.
   */
  private createVTodoQueryParams(calendarPath: string): CalendarQueryParams {
    return {
      url: calendarPath,
      props: { "calendar-data": {} },
      filters: {
        "comp-filter": {
          _attributes: { name: "VCALENDAR" },
          "comp-filter": {
            _attributes: { name: "VTODO" },
          },
        },
      },
      depth: "1" as DAVDepth,
    };
  }

  /**
   * Extracts the raw iCalendar string from a CalDAV query response, tolerating
   * the `string` / `{ _cdata }` shapes different servers/libraries return.
   */
  private extractICalData(obj: DAVResponse): string {
    const raw =
      obj.props?.["calendar-data"] ?? obj.props?.calendarData ?? "";

    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && raw !== null) {
      const dataObj = raw as Record<string, unknown>;
      if ("_cdata" in dataObj && typeof dataObj._cdata === "string") {
        return dataObj._cdata;
      }
    }
    return "";
  }
}
