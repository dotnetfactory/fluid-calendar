# FluidCalendar v2 - First Update: Booking Links & Enhanced Calendar Sync

## Announcement: Full Focus on Version 2

I'm excited to announce that I'm now dedicating all my development efforts to building **FluidCalendar Version 2**. This release marks our first major feature update on this journey, and there's much more to come.

**A note on versions**: I'm currently focusing on the SaaS version to ensure stability and reliability. Once the SaaS version is stable, I'll be updating the open-source version with these improvements as well.

---

## Release Highlights

**Schedule meetings without the back-and-forth.** FluidCalendar now includes a complete booking system that lets others schedule time with you based on your real availability—no more calendar Tetris.

---

## What's New

### Booking Links (Calendly-style Scheduling)

- **Create shareable booking links** - Generate personalized URLs (e.g., `/book/yourname/30-min-call`) that anyone can use to schedule time with you
- **Automatic availability detection** - The system checks your connected calendars in real-time to show only open slots
- **Customizable booking options**:
  - Set meeting duration (15, 30, 45, 60 minutes or custom)
  - Define minimum notice period (prevent last-minute bookings)
  - Set how far in advance people can book
  - Add buffer time before and after meetings
- **Smart calendar integration** - Choose which calendars to check for conflicts and where to create new events
- **Guest-friendly booking experience**:
  - Clean, responsive booking page
  - Automatic timezone detection
  - Week-by-week availability view
  - Simple form to capture guest details
- **Booking management**:
  - View all your bookings in one place
  - Guests can cancel bookings via email link
  - Automatic email notifications for confirmations and cancellations
  - ICS calendar attachments in confirmation emails
- **Custom usernames** - Set your unique username for personalized booking URLs

### Calendar Improvements

- **Better busy/free time detection** - Calendar events now properly track "transparency" (busy vs. free time) across Google, Outlook, and CalDAV calendars
- **Improved sync reliability** - Enhanced handling of calendar event transparency for more accurate availability
- **Reduced log noise** - Cleaner logs with less verbose permission checking messages

### Technical Improvements

- **React 19.0.3** - Updated to the latest React version
- **Next.js 15.3.8** - Updated to the latest Next.js version
- **Better Kubernetes scaling** - Improved auto-scaling with 2-5 replicas based on load

---

## See It In Action

Want to try the booking feature yourself? Schedule a chat with me about FluidCalendar, AI, or software development:

**Book a time:** https://fluidcalendar.com/book/eibrahim/fcchat

---

## What's Next?

This is just the beginning of Version 2. I'd love to hear what features matter most to you — drop your feedback and feature requests on GitHub!

**GitHub:** https://github.com/dotnetfactory/fluid-calendar

---

## Stats (Building in Public)

- **Current MRR**: $14
- **Lifetime Deal Sales**: $1,000
- **Focus**: Building the best open-source calendar + task management tool

---

## Breaking Changes

None in this release.

---

## Technical Notes (For Developers)

### Database Changes
- New models: `BookingLink`, `Booking`
- New field on `User`: `username` (unique, for booking URLs)
- New field on `CalendarEvent`: `transparency`

### New API Routes
- `/api/booking-links` - CRUD for booking links
- `/api/bookings` - List and manage bookings
- `/api/book/[username]/[slug]` - Public booking endpoint
- `/api/book/[username]/[slug]/availability` - Get available time slots
- `/api/book/cancel/[bookingId]` - Cancel bookings
- `/api/user/username` - Manage usernames

### New Libraries/Services
- Booking email service with Resend integration
- ICS file generation for calendar attachments
- Availability calculation engine

---

*FluidCalendar is an open-source alternative to Motion for intelligent task scheduling and calendar management.*

**GitHub:** https://github.com/dotnetfactory/fluid-calendar
