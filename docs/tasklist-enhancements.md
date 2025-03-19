# TaskList Enhancement Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the TaskList view with customization options and database persistence. We'll focus exclusively on improving the list view functionality before considering other view types.

## Database Schema Changes

Add a new table `user_view_settings`:

```sql
CREATE TABLE user_view_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_view_settings_user_id ON user_view_settings(user_id);
CREATE INDEX idx_user_view_settings_is_default ON user_view_settings(is_default);
```

The `settings` JSONB field will store:
```json
{
  "columns": [
    {
      "id": "status",
      "visible": true,
      "width": 120,
      "order": 1
    },
    {
      "id": "startDate",
      "visible": true,
      "width": 120,
      "order": 5
    },
    // other columns...
  ],
  "sort": {
    "by": "dueDate",
    "direction": "desc"
  },
  "filters": {
    "status": ["TODO", "IN_PROGRESS"],
    "energyLevel": null,
    "timePreference": null,
    "tagIds": null,
    "search": null,
    "startDate": null,
    "hideUpcomingTasks": false
  }
}
```

## Prisma Schema Update

Add the following to `schema.prisma`:
```prisma
model UserViewSettings {
  id         String   @id @default(uuid())
  userId     String
  name       String
  isDefault  Boolean  @default(false)
  settings   Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isDefault])
}

model User {
  // existing fields
  viewSettings UserViewSettings[]
}
```

## Implementation Tasks

### Phase 1: Database and API Setup

1. **Create Database Migration**
   - Create migration file for `user_view_settings` table
   - Add appropriate indexes and constraints
   - Run the migration

2. **Update Prisma Schema**
   - Add `UserViewSettings` model to Prisma schema
   - Define relationships with User model
   - Generate Prisma client

3. **Create API Endpoints**
   - `GET /api/view-settings` - List all view settings for current user
   - `GET /api/view-settings/:id` - Get specific view settings
   - `POST /api/view-settings` - Create new view settings
   - `PUT /api/view-settings/:id` - Update view settings
   - `DELETE /api/view-settings/:id` - Delete view settings
   - `PUT /api/view-settings/:id/set-default` - Set as default view

### Phase 2: Frontend State Management

4. **Create View Settings Store**
   - Create a new Zustand store for view settings
   - Implement methods to fetch, create, update, and delete view settings
   - Add synchronization with local storage for offline use

5. **Modify TaskListViewSettings Store**
   - Update to load from and save to the new API
   - Add methods to save current settings as a new view
   - Implement loading settings from saved views
   - Add support for the new startDate filter options

### Phase 3: UI Components for View Management

6. **Create View Selector Component**
   - Dropdown to select from saved views
   - Option to create a new view
   - Option to update current view
   - Option to delete current view

7. **Create View Settings Modal**
   - Form to name and configure view
   - Option to set as default view
   - Save and cancel buttons

### Phase 4: Column Customization

8. **Implement Column Selection**
   - Create a column selector component
   - Allow toggling visibility of columns (including startDate)
   - Store column visibility in view settings

9. **Add Column Reordering**
   - Implement drag and drop for column reordering
   - Update view settings when columns are reordered

10. **Add Column Resizing**
    - Implement column resizing functionality
    - Store column widths in view settings

### Phase 5: Advanced Filtering

11. **Enhance Filter UI**
    - Create a more advanced filter panel
    - Support multiple conditions for the same field
    - Add date range filters for due dates and start dates
    - Add "Hide future tasks" option that hides tasks with start dates in the future

12. **Implement Filter Persistence**
    - Save filter configurations in view settings
    - Load filters when switching views

### Phase 6: Row Customization

13. **Add Row Height Options**
    - Implement compact, default, and comfortable density options
    - Store row height preference in view settings

14. **Implement Row Styling Rules**
    - Add conditional formatting based on task properties
    - Store styling rules in view settings
    - Add visual indication for tasks with future start dates

### Phase 7: Testing and Refinement

15. **Write Unit Tests**
    - Test API endpoints
    - Test store functionality
    - Test UI components

16. **Perform Integration Testing**
    - Test end-to-end flow of creating, updating, and deleting views
    - Test persistence across page refreshes

17. **Optimize Performance**
    - Implement virtualization for large task lists
    - Add loading states for API operations

## Detailed Task Breakdown

### Task 1: Create Database Migration
- Create a new migration file in `/prisma/migrations`
- Define the `user_view_settings` table with all necessary fields
- Add appropriate indexes for performance
- Run the migration

### Task 2: Update Prisma Schema
- Add the UserViewSettings model to schema.prisma
- Define the relationship with the User model
- Run `npx prisma generate` to update the Prisma client

### Task 3: Create API Endpoints
- Create `/src/app/api/view-settings/route.ts` for GET (list) and POST endpoints
- Create `/src/app/api/view-settings/[id]/route.ts` for GET, PUT, DELETE endpoints
- Create `/src/app/api/view-settings/[id]/set-default/route.ts` for setting default view
- Implement authentication middleware to ensure users can only access their own views
- Add validation for request bodies

### Task 4: Create View Settings Store
- Create `/src/store/viewSettings.ts` with the following:
  - State for available views, current view, and loading states
  - Methods to fetch views from API
  - Methods to create, update, and delete views
  - Method to set default view
  - Synchronization with local storage

### Task 5: Modify TaskListViewSettings Store
- Update `/src/store/taskListViewSettings.ts` to:
  - Load initial settings from default view if available
  - Add method to save current settings to a view
  - Add method to load settings from a view
  - Keep local changes until explicitly saved
  - Add support for startDate filtering options

### Task 6: Create View Selector Component
- Create `/src/components/tasks/components/ViewSelector.tsx`
- Implement dropdown with list of saved views
- Add options to create, update, and delete views
- Style to match existing UI components

### Task 7: Create View Settings Modal
- Create `/src/components/tasks/components/ViewSettingsModal.tsx`
- Implement form for view name and default status
- Add tabs for different setting categories (columns, sorting, filtering)
- Include startDate options in the appropriate categories
- Implement save and cancel functionality

### Task 8: Implement Column Selection
- Create `/src/components/tasks/components/ColumnSelector.tsx`
- List all available columns with checkboxes (including startDate)
- Update TaskList to only render visible columns
- Store column visibility in view settings

### Task 9: Add Column Reordering
- Add drag and drop functionality to ColumnSelector
- Update column order in TaskList based on settings
- Save order changes to view settings

### Task 10: Add Column Resizing
- Add resize handles to table headers
- Implement resize functionality
- Store and apply column widths from settings

### Task 11: Enhance Filter UI
- Create `/src/components/tasks/components/AdvancedFilter.tsx`
- Support multiple conditions per field
- Add date range picker for due dates and start dates
- Add "Hide future tasks" option
- Implement AND/OR logic between conditions

### Task 12: Implement Filter Persistence
- Update filter state to load from view settings
- Save filter changes to view settings
- Reset filters when switching views

### Task 13: Add Row Height Options
- Add density selector to TaskList header
- Implement CSS classes for different densities
- Store preference in view settings

### Task 14: Implement Row Styling Rules
- Create UI for defining conditional formatting rules
- Apply styles to rows based on rules (including start date status)
- Add visual indicators for future tasks
- Store rules in view settings

### Task 15-17: Testing and Optimization
- Write unit tests for all new components and functionality
- Perform integration testing
- Implement virtualization for large lists
- Add loading states and error handling

## Technical Considerations

- Use React Query for API data fetching and caching
- Implement optimistic updates for a smoother user experience
- Use a throttled save mechanism to prevent excessive API calls
- Consider accessibility throughout the implementation
- Ensure mobile responsiveness for all new components
- Add proper support for the new startDate field in all components and filters

## Next Steps After Completion

Once the TaskList enhancements are complete and working perfectly, we can consider:

1. Implementing additional view types (Kanban, Calendar)
2. Adding more advanced features like task dependencies
3. Implementing team sharing of views
4. Adding AI-suggested views based on user behavior 
5. Creating saved filters for tasks based on start date (e.g., "Starting this week") 