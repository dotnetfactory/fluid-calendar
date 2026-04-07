# FluidCalendar adds support for open calendar standards with CalDAV integration

Hello r/opensource community!

I'm excited to share that FluidCalendar, my open-source alternative to Motion, now supports the open CalDAV standard for calendar integration!

## Why This Matters for Open Source

CalDAV is an open internet standard that allows calendar clients to access and manage calendar data on remote servers. By implementing CalDAV support, FluidCalendar now works with a wide range of open-source calendar servers including:

- NextCloud Calendar
- Radicale
- Baikal
- Any other CalDAV-compliant server

This means you can now have a completely open-source stack for your calendar and task management needs - from the server storing your events to the intelligent scheduling application.

## Open Standards for Calendar Data

One of the core principles of open source is freedom of choice and data portability. With CalDAV support:

- Your calendar data remains under your control
- You can switch between different calendar clients
- You're not locked into proprietary calendar systems
- You can self-host every component of your productivity system

## Implementation Details

The implementation uses open-source libraries including tsdav for CalDAV protocol support and ical.js for handling iCalendar data. The code is available on GitHub, so you can see exactly how it works and even contribute improvements.

You can read more details in my [blog post about the CalDAV integration](https://medium.com/front-end-weekly/fluidcalendar-expanding-calendar-support-with-caldav-integration-part-5-0633b1b56047).

## Try It Out!

The code is available at [github.com/dotnetfactory/fluid-calendar](https://github.com/dotnetfactory/fluid-calendar) under an open-source license. If you'd prefer not to self-host, there's also a [hosted version at fluidcalendar.com](https://fluidcalendar.com).

I'd love to hear feedback from the open-source community, especially if you have ideas for further improvements to the CalDAV integration!

---

_Related: [FluidCalendar is now open source](https://www.reddit.com/r/selfhosted/comments/1irj353/fluidcalendar_is_now_open_source/)_
