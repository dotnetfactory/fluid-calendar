# Change: Add "Book Me" Scheduling Links Feature

## Why

Users need a way to share their availability with external contacts who can then book meetings directly on their calendar—similar to Calendly or cal.com. This eliminates the back-and-forth of scheduling and is a core productivity feature for any modern calendar application.

## What Changes

- **New BookingLink model** for storing booking link configurations (name, slug, availability settings, calendar mappings)
- **New Booking model** for storing confirmed bookings from external guests
- **Public booking page** at `/book/[username]/[slug]` with FluidCalendar branding
- **Booking links management UI** in settings for creating/editing multiple booking links
- **Availability calculation** using existing calendar feeds to determine free/busy time
- **Video conferencing integration** with Google Meet and Zoom for auto-generating meeting links
- **Time zone handling** with automatic detection and manual override option
- **Email notifications** to both host and guest when bookings are made

### Premium vs Open-Source Tiers
- **Open-source**: 1 booking link, basic availability, no video integration
- **Premium (SaaS)**: Multiple booking links, video conferencing, custom buffer times, advanced availability rules

## Impact

- **Affected specs**: None existing (new capability)
- **New specs**: `booking-links`
- **Affected code**:
  - `prisma/schema.prisma` - new models
  - `src/app/(common)/settings/` - booking links management UI
  - `src/app/book/` - public booking pages (new route group)
  - `src/lib/availability/` - availability calculation service
  - `src/services/video/` - video conferencing integration
  - `src/lib/email/` - booking notification emails
- **Database changes**: **BREAKING** - requires migration for new tables
- **API changes**: New REST endpoints for booking links CRUD and public availability/booking endpoints
