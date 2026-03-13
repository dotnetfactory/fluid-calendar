# Product Context: Fluid Calendar

## Purpose

Fluid Calendar exists to provide a modern, efficient solution for calendar and task management, similar to Motion app. It aims to help users manage their schedule and tasks in one unified interface.

## Problems Solved

- Fragmented calendar management across multiple platforms
- Disconnect between tasks and calendar events
- Difficulty maintaining calendar data across different services
- Need for both open source and commercial solutions in this space

## Core Functionality

1. **Calendar Integration**

   - Connect Google, Outlook, or CalDAV calendars
   - Authorize through OAuth flows
   - Maintain local copies of calendar data for offline access
   - Handle token refresh automatically

2. **Task Management**

   - Create, edit, and delete tasks
   - Associate tasks with calendar events
   - Track task completion status

3. **User Experience**
   - Clean, modern UI built with Tailwind and Shadcn
   - Responsive design for mobile and desktop
   - Command palette for quick actions (cmdk)

## User Flow

1. User adds external calendar(s) through authentication flow
2. Calendar data syncs to local database
3. User can view, create, and manage events and tasks
4. Background processes keep data in sync with external calendars

## Versions and Licensing

- **Open Source**: Self-hosted version with core functionality
- **SAAS**: Commercial hosted service with premium features
- Clear separation between versions through code organization and feature flags
