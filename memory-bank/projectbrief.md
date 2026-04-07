# Project Brief: Fluid Calendar

## Overview

Fluid Calendar is a clone of the Motion app for calendar and task management. It has two versions:

1. **Open Source Version**: Free, self-hosted version with core functionality
2. **SAAS Version**: Hosted service with premium features

## Core Objectives

- Provide seamless calendar integration (Google, Outlook, CalDAV)
- Support task management alongside calendar events
- Offer intuitive UI with modern design (based on Shadcn)
- Maintain local data sync with external calendars
- Handle token refresh for external calendar services

## Technical Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- Shadcn UI components
- Zod for validation
- Zustand for state management
- FullCalendar for calendar displays
- BullMQ for background jobs and queue management

## Project Structure

- Core functionality in main directories
- SAAS-specific code in `src/saas/` directory
- Open source pages in `src/app/(open)`
- SAAS pages in `src/app/(saas)`
- Common pages in `src/app/(common)`
- Feature flagging using `isSaasEnabled` and `isFeatureEnabled()`

## Repository Strategy

- Private SAAS repository contains all code
- Public repository contains only open source code
- Sync between repositories using `scripts/sync-repos.sh`
- Special file extensions (.saas.tsx, .open.tsx) for version-specific files
