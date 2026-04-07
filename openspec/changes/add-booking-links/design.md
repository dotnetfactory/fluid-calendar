## Context

FluidCalendar needs a scheduling links feature ("Book Me") to allow users to share availability with external contacts. This is a standard feature in modern calendar apps (Calendly, cal.com, Motion). The solution must:

1. Work across both open-source and SaaS versions with tiered features
2. Integrate with existing calendar feeds for busy/free detection
3. Support video conferencing (Google Meet, Zoom) in premium tier
4. Handle time zones correctly across different user locations
5. Maintain FluidCalendar branding on public booking pages

### Stakeholders
- End users wanting to share availability
- External guests booking meetings
- SaaS subscribers expecting premium features
- Open-source users wanting basic scheduling

## Goals / Non-Goals

### Goals
- Allow users to create shareable booking links with custom slugs
- Calculate availability from multiple connected calendars
- Support fixed duration options (15/30/45/60 minutes)
- Auto-create calendar events with video conferencing links
- Send email confirmations to both host and guest
- Handle time zone detection and conversion correctly
- Differentiate premium features for SaaS tier

### Non-Goals
- Team/round-robin scheduling (future enhancement)
- Payment collection for bookings (future enhancement)
- Calendar-level booking restrictions (use existing calendar settings)
- Custom branding beyond FluidCalendar logo (future enhancement)
- Recurring booking slots (future enhancement)
- Buffer time between meetings in open-source tier

## Decisions

### Decision: URL Structure for Booking Pages
**Choice**: `/book/[username]/[slug]`

**Alternatives considered**:
1. `/book/[bookingLinkId]` - simpler but less memorable/shareable
2. `/[username]/[slug]` - conflicts with potential future user profile pages
3. Subdomain `[username].fluidcalendar.com` - requires DNS/cert complexity

**Rationale**: The chosen structure is human-readable, SEO-friendly, and allows users to have memorable URLs they can share verbally.

### Decision: Username Generation
**Choice**: Auto-generate username from email (before @) with collision handling, allow user override in settings.

**Rationale**: Most users want to get started quickly. Email prefix is a reasonable default. Override allows customization.

### Decision: Availability Calculation
**Choice**: Query existing CalendarEvent table filtered by selected CalendarFeeds, compute free slots server-side.

**Alternatives considered**:
1. Store availability separately - would duplicate data and risk sync issues
2. Client-side calculation - would expose all calendar data

**Rationale**: Reuses existing sync infrastructure, keeps calendar data server-side, single source of truth.

### Decision: Video Conferencing Integration
**Choice**: OAuth integration with Google Meet (via Google Calendar API) and Zoom API in premium tier.

**Implementation**:
- Google Meet: Use existing Google OAuth, create event with `conferenceData`
- Zoom: Add Zoom OAuth provider, call create meeting API

**Rationale**: Most common video platforms. Google Meet leverages existing Google integration.

### Decision: Tiered Feature Set

| Feature | Open-Source | Premium |
|---------|-------------|---------|
| Booking links | 1 | Unlimited |
| Duration options | 15/30/45/60 min | 15/30/45/60 min |
| Calendar selection | Yes | Yes |
| Time zone handling | Yes | Yes |
| Video conferencing | No | Google Meet + Zoom |
| Buffer between meetings | No | Configurable |
| Custom availability rules | Working hours only | Per-link custom hours |

**Rationale**: Core scheduling should be free, advanced productivity features drive premium conversion.

### Decision: Database Schema

```prisma
model BookingLink {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Link identity
  name              String    // "30 Minute Meeting"
  slug              String    // "30min" -> /book/username/30min
  description       String?

  // Availability settings
  duration          Int       // minutes (15, 30, 45, 60)
  selectedCalendars String    // JSON array of CalendarFeed IDs to check for conflicts
  targetCalendarId  String    // CalendarFeed ID to create events in

  // Time settings
  availabilityType  String    @default("working_hours") // "working_hours" | "custom"
  customAvailability String?  // JSON for custom hours per day (premium)
  bufferBefore      Int       @default(0)  // minutes (premium)
  bufferAfter       Int       @default(0)  // minutes (premium)
  minNotice         Int       @default(60) // minimum minutes before booking
  maxFutureDays     Int       @default(60) // how far in advance can book

  // Video conferencing (premium)
  videoProvider     String?   // "google_meet" | "zoom" | null

  // Status
  enabled           Boolean   @default(true)

  // Relations
  bookings          Booking[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@unique([userId, slug])
  @@index([userId])
}

model Booking {
  id              String      @id @default(cuid())
  bookingLinkId   String
  bookingLink     BookingLink @relation(fields: [bookingLinkId], references: [id], onDelete: Cascade)

  // Guest info
  guestName       String
  guestEmail      String
  guestNotes      String?
  guestTimezone   String

  // Booking details
  startTime       DateTime
  endTime         DateTime

  // Created event reference
  calendarEventId String?

  // Video link (if applicable)
  videoLink       String?

  // Status
  status          String      @default("confirmed") // "confirmed" | "cancelled"
  cancelledAt     DateTime?
  cancelReason    String?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([bookingLinkId])
  @@index([guestEmail])
  @@index([startTime])
}
```

### Decision: Add Username to User Model
**Choice**: Add `username` field to existing User model with unique constraint.

```prisma
model User {
  // ... existing fields
  username          String?   @unique  // For booking URL: /book/[username]/[slug]
}
```

**Rationale**: Username is core user identity, belongs on User model. Nullable for backward compatibility with existing users.

## Risks / Trade-offs

### Risk: Calendar Sync Lag
**Issue**: If calendar events haven't synced, booking might create conflicts.
**Mitigation**: Force sync on booking link creation, show "last synced" on booking page, implement real-time conflict check at booking time.

### Risk: Video API Rate Limits
**Issue**: Zoom/Google Meet APIs have rate limits.
**Mitigation**: Create meeting on booking confirmation, not on page load. Cache meeting links.

### Risk: Email Deliverability
**Issue**: Booking confirmation emails may go to spam.
**Mitigation**: Use Resend with proper SPF/DKIM. Include clear sender identity and unsubscribe.

### Risk: Time Zone Complexity
**Issue**: Time zone handling is error-prone.
**Mitigation**:
- Store all times in UTC
- Detect guest timezone via browser API
- Show times in both host and guest timezone on confirmation
- Use date-fns-tz for all conversions

### Risk: Username Conflicts
**Issue**: Popular usernames may be taken.
**Mitigation**: Generate with random suffix on conflict, allow user to change later.

## Migration Plan

### Phase 1: Database Migration
1. Add `username` column to User table (nullable)
2. Create BookingLink table
3. Create Booking table
4. Backfill usernames for existing users (from email prefix)

### Phase 2: Core Feature
1. Booking links CRUD API
2. Public booking page (availability view)
3. Booking submission flow
4. Calendar event creation

### Phase 3: Video Integration (Premium)
1. Google Meet integration (uses existing OAuth)
2. Zoom OAuth provider setup
3. Meeting link generation on booking

### Phase 4: Notifications
1. Host notification email
2. Guest confirmation email
3. Cancellation emails

### Rollback
- Delete BookingLink and Booking tables (preserves calendar events)
- Remove username column from User (optional, no harm keeping it)
- Feature flag `NEXT_PUBLIC_ENABLE_BOOKING_LINKS` to disable UI

## Open Questions

1. **Custom domains**: Should we support custom domains for booking pages (e.g., `meet.company.com/username`)? Defer to future.

2. **Cancellation policy**: Should hosts be able to set cancellation deadlines? Start without, add if requested.

3. **Rescheduling**: Should guests be able to reschedule? Start with cancel + rebook, add inline reschedule later.

4. **Calendar invites**: Should we send ICS files with confirmation emails? Yes - include in implementation.
