import ICAL from "ical.js";

import { convertVTodoToTask } from "@/lib/caldav-helpers";

/**
 * Parse a raw VCALENDAR string and return its first VTODO component.
 * These tests exercise `convertVTodoToTask` directly because it is pure
 * (no network/DB), which lets us assert the exact VTODO -> task mapping for
 * CalDAV task import (GitHub issue #144).
 */
function firstVtodo(ics: string): ICAL.Component {
  const jcal = ICAL.parse(ics);
  const vcalendar = new ICAL.Component(jcal);
  const vtodo = vcalendar.getFirstSubcomponent("vtodo");
  if (!vtodo) throw new Error("no VTODO in fixture");
  return vtodo;
}

const COMPLETED_DATED = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VTODO
UID:task-1@example.com
SUMMARY:Buy milk
DESCRIPTION:Two percent
DUE:20250701T120000Z
STATUS:COMPLETED
COMPLETED:20250630T080000Z
END:VTODO
END:VCALENDAR`;

const RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VTODO
UID:task-2@example.com
SUMMARY:Weekly review
RRULE:FREQ=WEEKLY;INTERVAL=1
END:VTODO
END:VCALENDAR`;

const NO_UID = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VTODO
SUMMARY:Orphan
END:VTODO
END:VCALENDAR`;

const NO_SUMMARY = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VTODO
UID:task-3@example.com
END:VTODO
END:VCALENDAR`;

describe("convertVTodoToTask (issue #144)", () => {
  it("maps a completed dated VTODO to an external task", () => {
    const task = convertVTodoToTask(firstVtodo(COMPLETED_DATED));

    expect(task).not.toBeNull();
    expect(task!.id).toBe("task-1@example.com");
    expect(task!.title).toBe("Buy milk");
    expect(task!.description).toBe("Two percent");
    expect(task!.dueDate).toBeInstanceOf(Date);
    expect(task!.dueDate!.toISOString()).toBe("2025-07-01T12:00:00.000Z");
    // Raw VTODO status string is carried through; the field mapper maps it to
    // the FluidCalendar TaskStatus enum.
    expect(task!.status).toBe("COMPLETED");
    expect(task!.completedDate).toBeInstanceOf(Date);
  });

  it("marks a VTODO with an RRULE as recurring with a FREQ=WEEKLY rule", () => {
    const task = convertVTodoToTask(firstVtodo(RECURRING));

    expect(task).not.toBeNull();
    expect(task!.isRecurring).toBe(true);
    expect(task!.recurrenceRule).toContain("FREQ=WEEKLY");
  });

  it("returns null for a VTODO without a UID (no stable identifier)", () => {
    const task = convertVTodoToTask(firstVtodo(NO_UID));
    expect(task).toBeNull();
  });

  it("uses a non-empty placeholder title when SUMMARY is absent", () => {
    const task = convertVTodoToTask(firstVtodo(NO_SUMMARY));
    expect(task).not.toBeNull();
    expect(typeof task!.title).toBe("string");
    expect(task!.title.length).toBeGreaterThan(0);
  });
});
