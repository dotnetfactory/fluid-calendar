import { accountsRouter } from "./routers/accounts/router";
import { authRouter } from "./routers/auth/router";
import { eventsRouter } from "./routers/events/router";
import { feedsRouter } from "./routers/feeds/router";
import { importExportRouter } from "./routers/import-export/router";
import { integrationStatusRouter } from "./routers/integration-status/router";
import { logsRouter } from "./routers/logs/router";
import { projectsRouter } from "./routers/projects/router";
import { settingsRouter } from "./routers/settings/router";
import { setupRouter } from "./routers/setup/router";
import { systemSettingsRouter } from "./routers/system-settings/router";
import { tagsRouter } from "./routers/tags/router";
import { taskSyncRouter } from "./routers/task-sync/router";
import { tasksRouter } from "./routers/tasks/router";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  accounts: accountsRouter,
  auth: authRouter,
  tags: tagsRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  events: eventsRouter,
  feeds: feedsRouter,
  importExport: importExportRouter,
  integrationStatus: integrationStatusRouter,
  logs: logsRouter,
  settings: settingsRouter,
  setup: setupRouter,
  systemSettings: systemSettingsRouter,
  taskSync: taskSyncRouter,
  // Other sub-routers will be added here as we implement them
});

// Export type definition of API
export type AppRouter = typeof appRouter;
