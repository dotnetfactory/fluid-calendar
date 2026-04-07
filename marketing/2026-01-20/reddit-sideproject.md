# r/SideProject

**Title:** 6 months into building an open-source Calendly alternative - just shipped booking links

---

Quick update on FluidCalendar, my open-source calendar + task scheduling app.

**Big news:** I'm now dedicating all my dev time to Version 2. This first update brings booking links - basically Calendly functionality but integrated directly into your calendar app.

**What I built:**

- Public booking pages (`yoursite.com/book/username/meeting-type`)
- Real-time availability based on your actual calendars
- Works with Google, Outlook, and CalDAV
- Smart defaults: timezone detection, buffer times, notice periods
- Email notifications with calendar attachments
- Guests can cancel via link in their email

The availability engine checks all your selected calendars, respects your working hours, accounts for existing bookings, and handles timezone conversions.

**Current numbers (building in public):**
- MRR: $14
- LTD sales: $1,000
- Stack: Next.js 15, React 19, PostgreSQL, Redis

The plan: Focus on making the SaaS version rock solid first, then push updates to the open-source version.

**GitHub:** https://github.com/dotnetfactory/fluid-calendar

**Try it yourself:** Want to see the booking feature in action? Schedule a chat with me about FluidCalendar, AI, or software dev: https://fluidcalendar.com/book/eibrahim/fcchat

What features would you want to see next? Always looking for feedback and feature requests!
