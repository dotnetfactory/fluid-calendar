# FluidCalendar now supports CalDAV for self-hosted calendar integration!

Hey r/selfhosted!

I wanted to share an update on FluidCalendar, my open-source smart calendar and task scheduler that I've been working on as an alternative to Motion.

## CalDAV Support is Here!

The latest update introduces **full CalDAV support**, which means you can now integrate FluidCalendar with virtually any self-hosted calendar solution, including:

- NextCloud Calendar
- Radicale
- Baikal
- Synology Calendar
- And any other CalDAV-compliant calendar server

This was one of the most requested features, especially from self-hosters who want to maintain control over their calendar data while still benefiting from intelligent task scheduling.

## What You Can Do With It

- Connect to multiple CalDAV calendars from different servers
- Full read/write support for events
- Proper handling of recurring events
- Get all the benefits of FluidCalendar's intelligent scheduling while keeping your calendar data on your own servers

## Technical Details

For those interested, the integration uses the tsdav library for the CalDAV protocol and ical.js for parsing and generating iCalendar data. I've also implemented special handling for various server quirks and differences in CalDAV implementations.

If you want to read about the implementation details, check out my [full blog post about the CalDAV integration](https://medium.com/front-end-weekly/fluidcalendar-expanding-calendar-support-with-caldav-integration-part-5-0633b1b56047).

## Try It Out!

You can check out the [open source version on GitHub](https://github.com/dotnetfactory/fluid-calendar) or try the [hosted version at fluidcalendar.com](https://fluidcalendar.com).

I'd love to hear your feedback, especially if you're connecting FluidCalendar to your self-hosted calendar servers!

---

_Related: [FluidCalendar is now open source](https://www.reddit.com/r/selfhosted/comments/1irj353/fluidcalendar_is_now_open_source/)_
