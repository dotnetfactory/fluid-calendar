## ADDED Requirements

### Requirement: Booking Link Management
Users SHALL be able to create, edit, and delete booking links through a management interface in settings. Each booking link SHALL have a unique slug (per user) that forms part of the shareable URL.

#### Scenario: Create booking link
- **WHEN** a user creates a new booking link with name "30 Minute Call" and slug "30min"
- **THEN** the system creates the booking link
- **AND** the shareable URL becomes `/book/[username]/30min`

#### Scenario: Slug uniqueness per user
- **WHEN** a user attempts to create a booking link with a slug that already exists for that user
- **THEN** the system rejects the creation with a validation error

#### Scenario: Edit booking link
- **WHEN** a user edits an existing booking link's name, duration, or calendar settings
- **THEN** the system updates the booking link
- **AND** existing bookings remain unchanged

#### Scenario: Delete booking link
- **WHEN** a user deletes a booking link
- **THEN** the system removes the booking link
- **AND** the public booking page returns 404
- **AND** existing calendar events from previous bookings remain in place

#### Scenario: Disable booking link
- **WHEN** a user disables a booking link
- **THEN** the public booking page shows "This booking link is currently unavailable"
- **AND** existing bookings remain valid

### Requirement: Booking Link Configuration
Users SHALL be able to configure each booking link with: duration (15/30/45/60 minutes), calendars to check for conflicts, target calendar for new events, minimum notice period, and maximum future days.

#### Scenario: Configure duration
- **WHEN** a user sets the duration to 30 minutes
- **THEN** all time slots shown to guests are 30 minutes long

#### Scenario: Configure conflict calendars
- **WHEN** a user selects multiple calendars to check for conflicts
- **THEN** the system considers events from all selected calendars when calculating availability

#### Scenario: Configure target calendar
- **WHEN** a user selects a target calendar for new events
- **THEN** all bookings create events in that calendar

#### Scenario: Configure minimum notice
- **WHEN** a user sets minimum notice to 4 hours
- **THEN** guests cannot book slots starting within the next 4 hours

#### Scenario: Configure maximum future days
- **WHEN** a user sets maximum future days to 30
- **THEN** guests can only see and book slots within the next 30 days

### Requirement: Booking Link Limits by Tier
The system SHALL enforce booking link limits based on subscription tier: open-source users can create 1 booking link, premium subscribers can create unlimited booking links.

#### Scenario: Open-source limit
- **WHEN** an open-source user attempts to create a second booking link
- **THEN** the system rejects the creation with an upgrade prompt

#### Scenario: Premium unlimited
- **WHEN** a premium subscriber creates multiple booking links
- **THEN** the system allows creation without limit

### Requirement: Public Booking Page
The system SHALL provide a public booking page at `/book/[username]/[slug]` that displays available time slots and allows guests to book meetings without authentication.

#### Scenario: View available slots
- **WHEN** a guest visits a valid booking page
- **THEN** the system displays the booking link name and description
- **AND** displays available time slots based on host availability
- **AND** displays FluidCalendar branding

#### Scenario: Time zone handling
- **WHEN** a guest visits the booking page
- **THEN** the system detects the guest's browser timezone
- **AND** displays all times in the guest's timezone
- **AND** allows the guest to manually select a different timezone

#### Scenario: Invalid booking link
- **WHEN** a guest visits a booking page for a non-existent or deleted link
- **THEN** the system returns a 404 page

#### Scenario: Disabled booking link
- **WHEN** a guest visits a booking page for a disabled link
- **THEN** the system displays "This booking link is currently unavailable"

### Requirement: Availability Calculation
The system SHALL calculate available time slots by checking the host's selected calendars for conflicts, respecting working hours settings, and applying minimum notice and buffer rules.

#### Scenario: Basic availability
- **WHEN** calculating availability for a booking link
- **THEN** the system retrieves events from all selected conflict calendars
- **AND** excludes time slots that overlap with existing events
- **AND** only shows slots within the host's working hours

#### Scenario: Minimum notice applied
- **WHEN** calculating availability with a 2-hour minimum notice
- **THEN** slots starting within the next 2 hours are not shown

#### Scenario: Buffer time applied (premium)
- **WHEN** a premium user has configured 15-minute buffer before and after
- **THEN** slots are excluded that would place meetings within 15 minutes of existing events

#### Scenario: Conflict detection at booking time
- **WHEN** a guest submits a booking for a time slot
- **THEN** the system re-checks for conflicts before confirming
- **AND** if a conflict exists (race condition), rejects with "This time is no longer available"

### Requirement: Booking Submission
Guests SHALL be able to book a meeting by selecting an available time slot and providing their name, email, and optional notes.

#### Scenario: Successful booking
- **WHEN** a guest selects a time slot and submits name and email
- **THEN** the system creates a booking record
- **AND** creates a calendar event in the host's target calendar
- **AND** adds the guest as an attendee on the event
- **AND** sends confirmation emails to both host and guest

#### Scenario: Required fields validation
- **WHEN** a guest submits a booking without name or email
- **THEN** the system rejects with validation errors

#### Scenario: Email format validation
- **WHEN** a guest submits a booking with an invalid email format
- **THEN** the system rejects with "Please enter a valid email address"

### Requirement: Video Conferencing Integration (Premium)
Premium users SHALL be able to configure booking links to automatically generate video conferencing links (Google Meet or Zoom) when bookings are made.

#### Scenario: Google Meet integration
- **WHEN** a premium user enables Google Meet on a booking link
- **AND** a guest books a meeting
- **THEN** the system creates a Google Meet link
- **AND** includes the link in the calendar event
- **AND** includes the link in confirmation emails

#### Scenario: Zoom integration
- **WHEN** a premium user enables Zoom on a booking link
- **AND** has connected their Zoom account
- **AND** a guest books a meeting
- **THEN** the system creates a Zoom meeting
- **AND** includes the link in the calendar event
- **AND** includes the link in confirmation emails

#### Scenario: No video provider in open-source
- **WHEN** an open-source user creates a booking link
- **THEN** the video conferencing options are not available

### Requirement: Booking Confirmation Emails
The system SHALL send confirmation emails to both the host and guest when a booking is made, including meeting details, time (in both timezones), location/video link, and calendar invite attachment.

#### Scenario: Guest confirmation email
- **WHEN** a booking is confirmed
- **THEN** the system sends an email to the guest
- **AND** includes meeting title, date/time in guest timezone, host name
- **AND** includes video link if configured
- **AND** attaches an ICS calendar invite file

#### Scenario: Host notification email
- **WHEN** a booking is confirmed
- **THEN** the system sends an email to the host
- **AND** includes guest name, email, meeting time in host timezone
- **AND** includes any notes provided by the guest

### Requirement: Booking Cancellation
Guests and hosts SHALL be able to cancel bookings. Cancelled bookings SHALL trigger notification emails and calendar event deletion.

#### Scenario: Guest cancellation
- **WHEN** a guest clicks the cancellation link in their confirmation email
- **THEN** the system marks the booking as cancelled
- **AND** removes or cancels the calendar event
- **AND** sends cancellation notification to the host

#### Scenario: Host cancellation
- **WHEN** a host cancels a booking from their dashboard
- **THEN** the system marks the booking as cancelled
- **AND** removes or cancels the calendar event
- **AND** sends cancellation notification to the guest with optional reason

### Requirement: Username for Booking URLs
Each user SHALL have a unique username used in booking URLs. The system SHALL auto-generate a username from the user's email but allow users to customize it.

#### Scenario: Auto-generate username
- **WHEN** a user creates their first booking link and has no username
- **THEN** the system generates a username from their email prefix
- **AND** appends a random suffix if the username is taken

#### Scenario: Custom username
- **WHEN** a user updates their username in settings
- **THEN** the system validates uniqueness
- **AND** updates all booking link URLs to use the new username

#### Scenario: Username validation
- **WHEN** a user attempts to set a username
- **THEN** the system validates it is alphanumeric with hyphens only
- **AND** rejects reserved words (admin, api, book, etc.)
- **AND** rejects if already taken by another user

### Requirement: Premium Buffer Time Configuration
Premium users SHALL be able to configure buffer time before and after meetings on a per-booking-link basis to prevent back-to-back scheduling.

#### Scenario: Configure buffer time
- **WHEN** a premium user sets 15-minute buffer before and 10-minute buffer after
- **THEN** availability calculation excludes slots that would violate these buffers

#### Scenario: Buffer not available in open-source
- **WHEN** an open-source user views booking link settings
- **THEN** buffer time options are hidden or shown with an upgrade prompt
