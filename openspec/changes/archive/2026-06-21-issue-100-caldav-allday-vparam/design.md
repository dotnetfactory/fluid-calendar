## Context

`CalDAVCalendarService.convertToICalendar` (in `src/lib/caldav-calendar.ts`) builds the iCalendar payload that is PUT to the CalDAV server for both create and update. For all-day events it currently does two things that each try to mark the property as a DATE:

1. `dtstart.setParameter("value", "date")` / `dtend.setParameter("value", "date")`, and
2. `dtstart.setValue(ICAL.Time.fromDateString("YYYY-MM-DD"))`, where the resulting `ICAL.Time` already has `isDate === true`.

When ical.js serializes the property, the explicit lowercase `value=date` parameter and the implicit `VALUE=DATE` from the date-typed value are both emitted, producing the invalid line:

```
DTSTART;VALUE=date;VALUE=DATE:20250406
```

RFC 5545 forbids repeating a property parameter, so strict servers (Baikal, Nextcloud) reject the PUT. Timed events are unaffected because they never call `setParameter` and use `ICAL.Time.fromJSDate(..., false)`.

## Goals / Non-Goals

**Goals:**
- All-day events serialize with a single, valid `VALUE=DATE` parameter on `DTSTART` and `DTEND`.
- The fix covers both create and update (same method).
- Timed-event serialization is byte-for-byte unchanged.

**Non-Goals:**
- Reworking the broader CalDAV create/update/fallback flow or the 401-vs-500 error surfacing.
- Changing the all-day end-date semantics (the existing "end = exclusive next day" behavior is preserved).
- Recurring all-day expansion changes.

## Decisions

- **Remove the manual `setParameter("value", "date")` calls and let the date-typed `ICAL.Time` carry the parameter.** Verified empirically: dropping the two `setParameter` calls turns `DTSTART;VALUE=date;VALUE=DATE:20250406` into the correct `DTSTART;VALUE=DATE:20250406`, and `ICAL.Time.fromDateString("2025-04-06").isDate === true`.
  - *Alternative considered:* keep `setParameter` and instead pass a non-date `ICAL.Time` (call `setParameter` only). Rejected: ical.js still needs a DATE-typed value to format `20250406` (no time component); the cleanest single-source-of-truth is the date-typed value.

## Risks / Trade-offs

- [Server still 401s for another reason] → The reproduction shows the malformed parameter is the only defect in the generated payload; viewing and timed-event writes already work with the same credentials, isolating the cause to serialization. Mitigation: unit test asserts exact, RFC-valid output.
- [Regressing timed events] → Mitigation: a unit test asserts timed events still emit `DTSTART:...T...` with no `VALUE` parameter.

## Migration Plan

Pure code fix; no migration. Rollback is reverting the commit.
