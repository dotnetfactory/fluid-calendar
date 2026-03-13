# r/selfhosted

**Title:** Just shipped booking links for my open-source calendar app - finally ditching Calendly

---

Hey everyone,

Been working on FluidCalendar, an open-source alternative to Motion/Calendly for calendar + task management. I'm now going all-in on building Version 2, and this is the first major update.

**What's new:**

Built a full booking system so others can schedule time with you based on your actual calendar availability:

- Shareable booking links (`/book/yourname/meeting-type`)
- Checks all your connected calendars for conflicts (Google, Outlook, CalDAV)
- Customizable: duration, buffer times, minimum notice, booking window
- Guest timezone auto-detection
- Email confirmations with ICS attachments
- Self-cancel links for guests

The booking page respects your working hours from your auto-schedule settings and excludes busy time from any calendar you select.

**Tech stack:** Next.js 15, React 19, Prisma, PostgreSQL, Redis for background jobs.

Currently focusing on the SaaS version to nail the experience, then I'll backport everything to the self-hosted version once it's stable.

**Where I'm at:**
- $14 MRR (just getting started)
- $1k in lifetime deal sales
- Actively building

**GitHub:** https://github.com/dotnetfactory/fluid-calendar

**Try it yourself:** Want to see the booking feature in action? Schedule a chat with me about FluidCalendar, AI, or software dev: https://fluidcalendar.com/book/eibrahim/fcchat

Would love to hear what features you'd want to see in a self-hosted calendar/scheduling tool. What's missing from existing options? Feature requests and feedback welcome!
