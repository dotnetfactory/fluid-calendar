# Beta Waitlist Implementation Guide

This document outlines the implementation plan for the beta waitlist feature in the SAAS version of FluidCalendar. The feature will allow us to manage a controlled rollout of the application to beta users, with admin controls for inviting users in batches.

## Database Schema ✅

- [x] **Create `WaitlistEntry` model in Prisma schema**
  - Fields: id, email, name, status (enum: WAITING, INVITED, REGISTERED), createdAt, invitedAt, registeredAt, invitationToken, invitationExpiry, referralCode, referredBy, notes
  - Add appropriate indexes for email and status fields
  - Add unique constraint on email
  - Add referralCount field to track number of successful referrals
  - Add priorityScore field to calculate position in the queue
  - Add lastVisitedAt field to track when user last checked their status

- [x] **Create `BetaSettings` model in Prisma schema**
  - Fields: id, maxActiveUsers, invitationEmailTemplate, waitlistConfirmationTemplate, reminderEmailTemplate, invitationValidDays, autoInviteEnabled, autoInviteCount, autoInviteFrequency
  - Add referralBoostAmount field to control how much each referral improves priority
  - Add maxReferralBoost field to cap the total boost from referrals
  - Add showQueuePosition field to control whether to show exact position or range
  - Add showTotalWaitlist field to control whether to show total waitlist size

- [x] **Add migration script**
  - Create migration for the new models
  - Add seed data for default email templates and settings

## Public Waitlist Page ✅

- [x] **Create public waitlist page route**
  - Path: `/beta` (accessible without authentication)
  - Design a clean, informative page explaining the beta program
  - Include waitlist signup form (email required, name optional)
  - Add privacy policy checkbox and terms acceptance
  - Add referral code field (optional) for users coming from a referral link
  - Implement email recognition for returning users

- [x] **Implement waitlist form submission**
  - Create API endpoint for form submission
  - Add validation for email format
  - Check if email already exists in waitlist or as registered user
  - Generate unique referral code for each entry
  - Implement rate limiting to prevent abuse
  - Process referral code if provided and update referrer's priority
  - Return appropriate response for new vs. returning users

- [x] **Create waitlist confirmation email**
  - Design email template with Resend
  - Include confirmation of waitlist position
  - Add personalized referral link prominently
  - Explain the referral benefits clearly
  - Set up email tracking for opens
  - Include link to check status page

## Waitlist Status Feature ✅

- [x] **Implement user recognition system**
  - Create email verification mechanism for returning users
  - Generate secure, time-limited access tokens for status page
  - Implement cookie-based recognition for frequent visitors
  - Add option to "remember this device" for easier access

- [x] **Build waitlist status dashboard**
  - Create dedicated status page with personalized information
  - Show current queue position and total people in waitlist
  - Display estimated time until invitation (if enabled)
  - Show referral performance statistics
  - Update lastVisitedAt timestamp when user checks status

- [x] **Implement position calculation system**
  - Create algorithm to calculate real-time queue position based on priority score
  - Add option to show exact position or position range based on admin settings
  - Implement caching to prevent excessive database queries
  - Create background job to recalculate positions periodically

- [x] **Add engagement features to status page**
  - Show progress bar or visual representation of position
  - Add "share your status" social media functionality
  - Implement milestone celebrations when position improves
  - Create personalized tips to improve position (e.g., "Refer 2 more friends to move up 10 spots")

## Referral System ✅

- [x] **Implement referral link generation**
  - Create unique, short referral codes for each waitlist entry
  - Build URL structure for referral links (e.g., `/beta?ref=CODE`)
  - Ensure referral codes are URL-friendly and easy to share
  - Add QR code generation for referral links

- [x] **Create referral tracking system**
  - Build database queries to track referral conversions
  - Implement priority score calculation based on referrals
  - Create mechanism to update waitlist position when new referrals join
  - Add protection against fraudulent referrals

- [x] **Build referral dashboard for users**
  - Create a page for users to track their referrals
  - Show current waitlist position and how it has improved
  - Display number of successful referrals
  - Add sharing options for social media and email

- [ ] **Implement referral notifications**
  - Send email notifications when someone uses a referral link
  - Create notification when waitlist position improves
  - Add milestone notifications (e.g., "You're in the top 100!")
  - Design gamification elements to encourage more referrals

## Admin Management Interface ✅

- [x] **Create admin waitlist dashboard**
  - Path: `/settings/admin/waitlist` (SAAS-only route)
  - Add access control to restrict to admin users only
  - Create overview statistics (total waiting, recently invited, conversion rate)
  - Add charts for waitlist growth and conversion trends
  - Include referral system metrics and effectiveness

- [x] **Implement waitlist entries table**
  - Create sortable/filterable table of all waitlist entries
  - Add status indicators (waiting, invited, registered)
  - Include search functionality by email or name
  - Add pagination for large lists
  - Show referral count and priority score columns
  - Add ability to sort by referral performance

- [x] **Create bulk actions for waitlist management**
  - Implement select/deselect functionality for entries
  - Add bulk invite action with confirmation dialog
  - Create bulk delete action with confirmation
  - Add bulk export to CSV option
  - Add option to boost priority for selected entries

- [x] **Build invitation management interface**
  - Create form to send invitations to selected users
  - Add option to customize invitation message
  - Implement scheduling for delayed invitations
  - Add preview functionality for invitation emails
  - Include option to prioritize users with most referrals

- [x] **Implement beta settings configuration**
  - Create form for updating beta settings
  - Add controls for max users, invitation validity period
  - Create email template editor with variables support
  - Add toggle for automatic invitations
  - Add controls for referral boost settings

## Next Steps

Let's implement the following features next:

1. **API Integration**
   - Connect the admin dashboard to the backend API
   - Implement data fetching and state management
   - Add real-time updates for waitlist statistics

2. **Referral Notifications**
   - Implement email notifications for referrals
   - Create milestone notifications for waitlist position improvements
   - Add gamification elements to encourage more referrals
