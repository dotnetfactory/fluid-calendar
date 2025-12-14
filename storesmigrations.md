# Store Factory Migration & Refactoring Guide

## 📋 Overview

This document explains the comprehensive refactoring of our Zustand stores to use a standardized factory pattern. This migration was completed across 4 commits and affects all application stores, providing better type safety, consistency, and maintainability.

## 🎯 Why This Refactoring?

### Problems Solved

- **Inconsistent store patterns** - Each store had different structures and methods
- **Missing standardization** - No enforced clear() methods for logout cleanup
- **Type safety gaps** - Loose typing between state and actions
- **Maintenance overhead** - Repetitive boilerplate across stores
- **Testing complexity** - No standardized way to reset stores

### Benefits Achieved

- ✅ **Standardized interface** - All stores now have consistent structure
- ✅ **Enforced clear() method** - Automatic logout cleanup capability
- ✅ **Enhanced type safety** - Strict separation of state and actions
- ✅ **Reduced boilerplate** - Factory handles common patterns
- ✅ **Better testability** - Consistent reset mechanisms
- ✅ **Centralized management** - Single point for store operations

## 🏗️ Technical Architecture

### Store Factory Pattern

The new factory creates standardized Zustand stores with enforced methods:

```typescript
// Core factory function
export function createStandardStore<TState, TActions>(
  options: StoreFactoryOptions<TState, TActions>
): ExtendedStore<TState, TActions>;

// Standard interface all stores must implement
export interface StandardStoreMethods {
  clear: () => void;
}
```

### Type Structure

```typescript
// Separate state and actions for better type safety
interface MyState {
  data: string[];
  loading: boolean;
}

interface MyActions {
  fetchData: () => Promise<void>;
  updateData: (data: string[]) => void;
}

// Factory combines them with standard methods
type CompleteStore = MyState & MyActions & StandardStoreMethods;
```

## 🔄 Migration Details

### Before: Traditional Zustand Pattern

```typescript
// Old pattern - everything mixed together
interface TaskState {
  tasks: Task[];
  loading: boolean;
  // Actions mixed with state
  fetchTasks: () => Promise<void>;
  createTask: (task: NewTask) => Promise<Task>;
  // No enforced clear method
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      loading: false,
      fetchTasks: async () => {
        /* implementation */
      },
      createTask: async (task) => {
        /* implementation */
      },
      // Manual persistence setup
    }),
    { name: "task-store" }
  )
);
```

### After: Factory Pattern

```typescript
// New pattern - clean separation
interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
}

interface TaskActions {
  fetchTasks: () => Promise<void>;
  createTask: (task: NewTask) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTask) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = createStandardStore({
  name: "task-store",
  initialState: {
    tasks: [],
    loading: false,
    error: null,
  } as TaskState,

  storeCreator: (set, get) =>
    ({
      fetchTasks: async () => {
        /* implementation */
      },
      createTask: async (task) => {
        /* implementation */
      },
      // ... other actions
    }) satisfies TaskActions,

  persist: true, // Automatic persistence
  // clear() method automatically provided
});
```

## 🛠️ Key Features

### 1. Automatic Clear Method

Every store now has a standardized `clear()` method:

```typescript
// Default behavior - resets to initial state
store.getState().clear();

// Custom clear behavior (optional)
const useCustomStore = createStandardStore({
  // ... other options
  customClear: (set, get, initialState) => {
    // Custom logic - e.g., keep some data, clear others
    const current = get();
    set({ ...current, sensitiveData: initialState.sensitiveData });
  },
});
```

### 2. Enhanced Type Safety

```typescript
// Strict typing prevents mixing concerns
interface State {
  count: number;
}
interface Actions {
  increment: () => void;
}

// TypeScript enforces correct structure
const store = createStandardStore({
  initialState: { count: 0 } as State,
  storeCreator: (set) =>
    ({
      increment: () => set((state) => ({ count: state.count + 1 })),
    }) satisfies Actions, // Type checking here
});
```

### 3. Persistence Made Simple

```typescript
// Automatic persistence with sensible defaults
const store = createStandardStore({
  name: "my-store",
  persist: true, // That's it!

  // Optional custom persistence options
  persistOptions: {
    version: 1,
    storageKey: "custom-key",
  },
});
```

## 🏪 Store Management System

### Centralized Store Management

New `store-management.ts` provides centralized operations:

```typescript
// Initialize all stores on app start/login
await initializeStores();

// Clear all stores on logout
clearStoresOnLogout();

// React hook for logout with cleanup
const { logoutWithCleanup, isLoggingOut } = useLogout();
```

### Store Categories

```typescript
const STORE_KEYS = {
  // Completely cleared on logout
  clearCompletely: [
    "task-store",
    "project-store",
    "calendar-store",
    "fluid-calendar-setup-storage",
  ],

  // Keep UI preferences, clear user data
  keepPreferences: [
    "calendar-view-store",
    "calendar-ui-store",
    "settings-store",
  ],
};
```

## 📊 Migration Summary

### Stores Migrated (12 total)

| Store              | File                                | Key Changes                                    |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| Task Store         | `src/store/task.ts`                 | Separated state/actions, added error handling  |
| Project Store      | `src/store/project.ts`              | Enhanced type safety, standardized methods     |
| Calendar Store     | `src/store/calendar.ts`             | Split view/data concerns, improved persistence |
| Settings Store     | `src/store/settings.ts`             | Modular settings updates, better defaults      |
| Setup Store        | `src/store/setup.ts`                | Streamlined setup flow, clear reset capability |
| Focus Mode         | `src/store/focusMode.ts`            | Simplified state management                    |
| Log View           | `src/store/logview.ts`              | Enhanced filtering, better performance         |
| Shortcuts          | `src/store/shortcuts.ts`            | Standardized shortcut management               |
| Task Modal         | `src/store/taskModal.ts`            | Modal state consistency                        |
| Task List View     | `src/store/taskListViewSettings.ts` | View preferences management                    |
| Task Page Settings | `src/store/taskPageSettings.ts`     | Page-specific settings                         |
| Waitlist (SaaS)    | `src/store/waitlist.saas.ts`        | SaaS-specific functionality                    |

### Files Changed (25 total)

#### Core Factory Files

- `src/lib/store-factory/factory.ts` - Main factory implementation
- `src/lib/store-factory/types.ts` - Type definitions
- `src/lib/store-factory/index.ts` - Public exports

#### Store Files (12 stores)

- All store files in `src/store/` directory

#### Management & Integration

- `src/lib/auth/store-management.ts` - Centralized store operations
- `src/components/setup/SetupCheck.tsx` - Updated to use new store pattern

#### Calendar Components (4 files)

- `src/components/calendar/DayView.tsx`
- `src/components/calendar/MonthView.tsx`
- `src/components/calendar/MultiMonthView.tsx`
- `src/components/calendar/WeekView.tsx`

## 🧪 Testing Considerations

### What to Test

1. **Store Initialization**

   ```typescript
   // Verify stores initialize with correct default state
   const store = useTaskStore.getState();
   expect(store.tasks).toEqual([]);
   expect(store.loading).toBe(false);
   ```

2. **Clear Functionality**

   ```typescript
   // Test clear method resets to initial state
   store.getState().createTask(mockTask);
   store.getState().clear();
   expect(store.getState().tasks).toEqual([]);
   ```

3. **Persistence**

   ```typescript
   // Verify data persists across page reloads
   // Test localStorage cleanup on logout
   ```

4. **Type Safety**
   ```typescript
   // Ensure TypeScript catches type errors
   // Verify state/action separation
   ```

### Breaking Changes

⚠️ **Potential Breaking Changes:**

- Store interfaces now separate state and actions
- Some method signatures may have changed
- Clear method is now mandatory on all stores
- Persistence configuration simplified

## 📝 Team Guidelines

### Creating New Stores

```typescript
// 1. Define separate interfaces
interface MyState {
  data: MyData[];
  loading: boolean;
  error: Error | null;
}

interface MyActions {
  fetchData: () => Promise<void>;
  updateData: (data: MyData[]) => void;
}

// 2. Use the factory
export const useMyStore = createStandardStore({
  name: "my-store", // Unique name
  initialState: {
    data: [],
    loading: false,
    error: null,
  } as MyState,

  storeCreator: (set, get) =>
    ({
      fetchData: async () => {
        set({ loading: true, error: null });
        try {
          // Implementation
          set({ data: result, loading: false });
        } catch (error) {
          set({ error: error as Error, loading: false });
        }
      },
      // ... other actions
    }) satisfies MyActions,

  persist: true, // Enable if needed
});
```

### Code Review Checklist

- [ ] State and actions are properly separated
- [ ] Store uses `createStandardStore` factory
- [ ] Unique store name provided
- [ ] Initial state properly typed
- [ ] Actions use `satisfies` for type checking
- [ ] Error handling included where appropriate
- [ ] Persistence enabled if data should survive page reloads
- [ ] Store added to `store-management.ts` if user-specific

### Best Practices

1. **Naming Convention**: Use descriptive, unique store names
2. **Error Handling**: Always include error state and handling
3. **Loading States**: Include loading indicators for async operations
4. **Type Safety**: Use `satisfies` keyword for action type checking
5. **Persistence**: Only enable for data that should survive reloads
6. **Clear Logic**: Implement custom clear if default behavior isn't sufficient

## 🚀 Future Considerations

### Planned Enhancements

- Store composition patterns for complex stores
- Middleware system for common operations (logging, analytics)
- Development tools integration
- Performance monitoring hooks

### Migration Path for New Features

- All new stores must use the factory pattern
- Legacy stores will be migrated as they're modified
- Consider store splitting for large, complex stores

## 🔍 Commit History

This refactoring was completed across 4 commits:

1. **`4c64a3b`** - `refactor stores` - Initial factory implementation and store migrations
2. **`1e5fd5e`** - `remove md files and add explanation` - Cleanup and documentation
3. **`44cbd3a`** - `PR feedback` - Addressed review feedback
4. **`b0a7462`** - `types fix` - Final type safety improvements

---

## 💡 Questions & Support

For questions about this refactoring or the new store patterns:

1. Review this documentation
2. Check the factory implementation in `src/lib/store-factory/`
3. Look at migrated stores for examples
4. Reach out to the team for clarification

This migration significantly improves our store architecture and sets us up for better maintainability and developer experience going forward.
