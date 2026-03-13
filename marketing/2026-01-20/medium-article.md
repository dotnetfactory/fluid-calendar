# Medium Article

---

# I'm Building Version 2 of My Open-Source Calendar App — Here's the First Major Update

## Announcing FluidCalendar's new booking system and a call for your feedback

---

I've made a decision: I'm dedicating all my development time to building Version 2 of FluidCalendar.

For those unfamiliar, FluidCalendar is an open-source alternative to Motion — an intelligent calendar and task management app that helps you actually manage your time, not just display it.

Today, I'm shipping the first major Version 2 feature: **booking links**.

---

## The Problem With Scheduling

If you've ever tried to schedule a meeting with someone, you know the pain:

*"What times work for you?"*
*"How about Tuesday at 2pm?"*
*"Sorry, I have a conflict. Wednesday?"*
*"I'm traveling Wednesday. Thursday?"*

This back-and-forth is why tools like Calendly exist. But here's my issue with standalone scheduling tools: they're yet another app in your productivity stack.

You have:
- A calendar app for events
- A task manager for to-dos
- A scheduling tool for bookings
- Maybe a time tracker too

They don't talk to each other properly. Your availability in one doesn't account for the others.

---

## What I Built

FluidCalendar's new booking system integrates directly with your calendar and task management. When someone books time with you, the system checks:

1. **All your connected calendars** — Google, Outlook, CalDAV, whatever you use
2. **Your working hours** — from your auto-schedule settings
3. **Existing bookings** — so you don't get double-booked
4. **Buffer times** — because back-to-back meetings are exhausting

### Features

**For you (the host):**
- Create multiple booking link types (30-min call, 60-min consultation, etc.)
- Set custom usernames for clean URLs (`/book/yourname/meeting-type`)
- Choose which calendars to check for conflicts
- Set where new bookings should appear
- Define minimum notice and maximum future booking windows
- Add buffer time before and after meetings

**For your guests:**
- Clean, responsive booking page
- Automatic timezone detection
- Week-by-week availability view
- Simple form for name, email, and notes
- Confirmation email with calendar (.ics) attachment
- Easy cancellation via email link

---

## A Note on SaaS vs. Open Source

I'm currently focusing on the SaaS version. Why?

Building a great product requires iteration based on real usage. The SaaS version lets me:
- Get direct feedback from paying users
- Monitor for issues in production
- Iterate quickly without breaking self-hosted setups

Once the features are stable, I'll backport everything to the open-source version. The goal is for self-hosted users to get the same experience — just on their own infrastructure.

---

## Building in Public: The Numbers

I believe in transparency, so here's where I stand:

- **Monthly Recurring Revenue:** $14
- **Lifetime Deal Sales:** $1,000
- **Team:** Just me

Yes, $14 MRR. Everyone starts somewhere.

The LTD sales from early believers gave me runway to focus on building. Now I'm heads-down on making the product good enough that people want to pay monthly for it.

---

## Why Open Source?

People often ask why I'm building this as open source when competitors charge premium prices.

A few reasons:

1. **Trust** — Your calendar data is sensitive. Open source means you can verify exactly what the code does.
2. **Flexibility** — Self-host it, modify it, integrate it however you need.
3. **Community** — Some of the best feature ideas come from users who understand the codebase.
4. **Longevity** — Even if I stop working on this tomorrow, the code lives on.

The SaaS version exists for people who want a managed experience without the hosting overhead. Both can coexist.

---

## See It In Action

Want to try the booking feature yourself? Schedule a chat with me about FluidCalendar, AI, or software development:

**Book a time:** https://fluidcalendar.com/book/eibrahim/fcchat

---

## What Should I Build Next?

This is where you come in.

I'm building FluidCalendar based on what users actually need — not what I think they might want. The booking system exists because people asked for it.

**What features would make this your go-to calendar app?**

Drop your feedback and feature requests:
- On GitHub: https://github.com/dotnetfactory/fluid-calendar
- In the comments below
- Or reach out directly

The roadmap isn't set in stone. Your input directly shapes what gets built next.

---

*Building in public, one feature at a time.*

**GitHub:** https://github.com/dotnetfactory/fluid-calendar
