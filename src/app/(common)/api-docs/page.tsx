"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

// --- Types ---

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params?: { name: string; type: string; description: string; required?: boolean }[];
  body?: { name: string; type: string; description: string; required?: boolean }[];
  response?: string;
}

interface EndpointGroup {
  title: string;
  description: string;
  endpoints: Endpoint[];
}

// --- Endpoint Data ---

const endpointGroups: EndpointGroup[] = [
  {
    title: "Tasks",
    description: "Create, read, update, and delete tasks.",
    endpoints: [
      {
        method: "GET",
        path: "/api/tasks",
        description: "List all tasks for the authenticated user. Supports filtering by status, tags, energy level, time preference, date ranges, and full-text search.",
        params: [
          { name: "status", type: "string[]", description: "Filter by status: todo, in_progress, completed" },
          { name: "tagIds", type: "string[]", description: "Filter by tag IDs" },
          { name: "energyLevel", type: "string[]", description: "Filter by energy level: high, medium, low" },
          { name: "timePreference", type: "string[]", description: "Filter by time preference: morning, afternoon, evening" },
          { name: "search", type: "string", description: "Full-text search on title and description" },
          { name: "startDate", type: "ISO 8601", description: "Due date range start" },
          { name: "endDate", type: "ISO 8601", description: "Due date range end" },
          { name: "hideUpcomingTasks", type: "boolean", description: "Hide tasks with a future startDate" },
        ],
        response: "Task[]",
      },
      {
        method: "POST",
        path: "/api/tasks",
        description: "Create a new task.",
        body: [
          { name: "title", type: "string", description: "Task title", required: true },
          { name: "description", type: "string", description: "Task description" },
          { name: "status", type: "string", description: "Task status: todo, in_progress, completed", required: true },
          { name: "dueDate", type: "ISO 8601", description: "Due date" },
          { name: "startDate", type: "ISO 8601", description: "Start date" },
          { name: "duration", type: "number", description: "Estimated duration in minutes" },
          { name: "priority", type: "string", description: "Priority: high, medium, low, none" },
          { name: "energyLevel", type: "string", description: "Energy level: high, medium, low" },
          { name: "preferredTime", type: "string", description: "Preferred time: morning, afternoon, evening" },
          { name: "projectId", type: "string", description: "Project ID to associate with" },
          { name: "tagIds", type: "string[]", description: "Tag IDs to associate with" },
          { name: "recurrenceRule", type: "string", description: "RRULE string for recurring tasks" },
          { name: "isAutoScheduled", type: "boolean", description: "Enable auto-scheduling" },
        ],
        response: "Task",
      },
      {
        method: "GET",
        path: "/api/tasks/:id",
        description: "Get a single task by ID.",
        response: "Task",
      },
      {
        method: "PUT",
        path: "/api/tasks/:id",
        description: "Update a task. Include only the fields you want to change.",
        body: [
          { name: "title", type: "string", description: "Task title" },
          { name: "description", type: "string", description: "Task description" },
          { name: "status", type: "string", description: "Task status" },
          { name: "dueDate", type: "ISO 8601 | null", description: "Due date (null to clear)" },
          { name: "priority", type: "string | null", description: "Priority (null to clear)" },
          { name: "projectId", type: "string | null", description: "Project ID (null to unassign)" },
          { name: "tagIds", type: "string[]", description: "Tag IDs (replaces all tags)" },
        ],
        response: "Task",
      },
      {
        method: "DELETE",
        path: "/api/tasks/:id",
        description: "Delete a task permanently.",
        response: "{ success: true }",
      },
      {
        method: "POST",
        path: "/api/tasks/schedule-all",
        description: "Trigger auto-scheduling for all eligible tasks.",
        response: "{ scheduled: number }",
      },
    ],
  },
  {
    title: "Projects",
    description: "Organize tasks into projects.",
    endpoints: [
      {
        method: "GET",
        path: "/api/projects",
        description: "List all projects. Supports filtering by status and search.",
        params: [
          { name: "status", type: "string[]", description: "Filter by status: active, archived" },
          { name: "search", type: "string", description: "Search by name or description" },
        ],
        response: "Project[]",
      },
      {
        method: "POST",
        path: "/api/projects",
        description: "Create a new project.",
        body: [
          { name: "name", type: "string", description: "Project name", required: true },
          { name: "description", type: "string", description: "Project description" },
          { name: "color", type: "string", description: "Color hex code" },
          { name: "status", type: "string", description: "Status: active (default) or archived" },
        ],
        response: "Project",
      },
      {
        method: "GET",
        path: "/api/projects/:id",
        description: "Get a single project by ID.",
        response: "Project",
      },
      {
        method: "PUT",
        path: "/api/projects/:id",
        description: "Update a project.",
        response: "Project",
      },
      {
        method: "DELETE",
        path: "/api/projects/:id",
        description: "Delete a project and all associated tasks.",
        response: "{ success: true }",
      },
    ],
  },
  {
    title: "Tags",
    description: "Manage tags for organizing tasks.",
    endpoints: [
      {
        method: "GET",
        path: "/api/tags",
        description: "List all tags.",
        response: "Tag[]",
      },
      {
        method: "POST",
        path: "/api/tags",
        description: "Create a new tag.",
        body: [
          { name: "name", type: "string", description: "Tag name", required: true },
          { name: "color", type: "string", description: "Color hex code" },
        ],
        response: "Tag",
      },
      {
        method: "PUT",
        path: "/api/tags/:id",
        description: "Update a tag.",
        response: "Tag",
      },
      {
        method: "DELETE",
        path: "/api/tags/:id",
        description: "Delete a tag.",
        response: "{ success: true }",
      },
    ],
  },
  {
    title: "Calendar Events",
    description: "Manage calendar events across all connected calendars.",
    endpoints: [
      {
        method: "GET",
        path: "/api/events",
        description: "List all calendar events from feeds owned by the user.",
        response: "CalendarEvent[]",
      },
      {
        method: "POST",
        path: "/api/events",
        description: "Create a new calendar event.",
        body: [
          { name: "feedId", type: "string", description: "Calendar feed ID", required: true },
          { name: "title", type: "string", description: "Event title", required: true },
          { name: "start", type: "ISO 8601", description: "Start time", required: true },
          { name: "end", type: "ISO 8601", description: "End time", required: true },
          { name: "description", type: "string", description: "Event description" },
          { name: "location", type: "string", description: "Event location" },
          { name: "allDay", type: "boolean", description: "All-day event flag" },
          { name: "isRecurring", type: "boolean", description: "Is recurring" },
          { name: "recurrenceRule", type: "string", description: "RRULE string" },
        ],
        response: "CalendarEvent",
      },
      {
        method: "PATCH",
        path: "/api/events",
        description: "Update an existing calendar event.",
        body: [
          { name: "id", type: "string", description: "Event ID", required: true },
          { name: "title", type: "string", description: "Updated title" },
          { name: "start", type: "ISO 8601", description: "Updated start time" },
          { name: "end", type: "ISO 8601", description: "Updated end time" },
        ],
        response: "CalendarEvent",
      },
      {
        method: "DELETE",
        path: "/api/events",
        description: "Delete a calendar event.",
        body: [
          { name: "id", type: "string", description: "Event ID", required: true },
        ],
        response: "{ success: true }",
      },
    ],
  },
  {
    title: "Calendar Feeds",
    description: "Manage calendar feed subscriptions.",
    endpoints: [
      {
        method: "GET",
        path: "/api/feeds",
        description: "List all calendar feeds for the user.",
        response: "CalendarFeed[]",
      },
      {
        method: "POST",
        path: "/api/feeds",
        description: "Create a new calendar feed.",
        body: [
          { name: "name", type: "string", description: "Feed name", required: true },
          { name: "type", type: "string", description: "Feed type: LOCAL, GOOGLE, OUTLOOK, CALDAV", required: true },
          { name: "url", type: "string", description: "Feed URL (for remote feeds)" },
          { name: "color", type: "string", description: "Feed color" },
        ],
        response: "CalendarFeed",
      },
      {
        method: "PATCH",
        path: "/api/feeds",
        description: "Update a calendar feed.",
        body: [
          { name: "id", type: "string", description: "Feed ID", required: true },
          { name: "enabled", type: "boolean", description: "Enable/disable feed" },
          { name: "color", type: "string", description: "Feed color" },
        ],
        response: "CalendarFeed",
      },
      {
        method: "DELETE",
        path: "/api/feeds",
        description: "Delete a calendar feed.",
        body: [
          { name: "id", type: "string", description: "Feed ID", required: true },
        ],
        response: "{ success: true }",
      },
      {
        method: "POST",
        path: "/api/feeds/:id/sync",
        description: "Trigger sync for a specific feed.",
        response: "{ success: true }",
      },
    ],
  },
  {
    title: "Connected Accounts",
    description: "Manage connected calendar accounts (Google, Outlook, CalDAV).",
    endpoints: [
      {
        method: "GET",
        path: "/api/accounts",
        description: "List all connected accounts.",
        response: "ConnectedAccount[]",
      },
      {
        method: "DELETE",
        path: "/api/accounts",
        description: "Disconnect an account.",
        body: [
          { name: "accountId", type: "string", description: "Account ID to disconnect", required: true },
        ],
        response: "{ success: true }",
      },
    ],
  },
  {
    title: "User Settings",
    description: "Manage user preferences and display settings.",
    endpoints: [
      {
        method: "GET",
        path: "/api/user-settings",
        description: "Get the current user's settings (theme, timezone, etc.).",
        response: "UserSettings",
      },
      {
        method: "PATCH",
        path: "/api/user-settings",
        description: "Update user settings.",
        body: [
          { name: "theme", type: "string", description: "Theme: light, dark, system" },
          { name: "defaultView", type: "string", description: "Default view: day, week, month, agenda" },
          { name: "timeZone", type: "string", description: "IANA timezone string" },
          { name: "weekStartDay", type: "string", description: "Week start: monday, sunday" },
          { name: "timeFormat", type: "string", description: "Time format: 12h, 24h" },
        ],
        response: "UserSettings",
      },
    ],
  },
  {
    title: "Auto-Schedule Settings",
    description: "Configure automatic task scheduling preferences.",
    endpoints: [
      {
        method: "GET",
        path: "/api/auto-schedule-settings",
        description: "Get auto-schedule configuration.",
        response: "AutoScheduleSettings",
      },
      {
        method: "PATCH",
        path: "/api/auto-schedule-settings",
        description: "Update auto-schedule settings.",
        body: [
          { name: "workDays", type: "number[]", description: "Working days (0=Sun, 6=Sat)" },
          { name: "workHourStart", type: "number", description: "Work start hour (0-23)" },
          { name: "workHourEnd", type: "number", description: "Work end hour (0-23)" },
          { name: "bufferMinutes", type: "number", description: "Buffer between tasks (minutes)" },
          { name: "selectedCalendars", type: "string[]", description: "Calendar IDs to check for conflicts" },
        ],
        response: "AutoScheduleSettings",
      },
    ],
  },
  {
    title: "Import / Export",
    description: "Bulk import and export task data.",
    endpoints: [
      {
        method: "GET",
        path: "/api/export/tasks",
        description: "Export all tasks as JSON.",
        params: [
          { name: "includeCompleted", type: "boolean", description: "Include completed tasks in export" },
        ],
        response: "{ tasks: Task[], projects: Project[], tags: Tag[] }",
      },
      {
        method: "POST",
        path: "/api/import/tasks",
        description: "Import tasks from a JSON file.",
        body: [
          { name: "tasks", type: "Task[]", description: "Array of tasks to import", required: true },
          { name: "projects", type: "Project[]", description: "Array of projects" },
          { name: "tags", type: "Tag[]", description: "Array of tags" },
        ],
        response: "{ imported: number }",
      },
    ],
  },
  {
    title: "API Keys",
    description: "Manage API keys for programmatic access.",
    endpoints: [
      {
        method: "GET",
        path: "/api/api-keys",
        description: "List all active API keys (metadata only, not the key value).",
        response: "ApiKey[]",
      },
      {
        method: "POST",
        path: "/api/api-keys",
        description: "Create a new API key. The raw key is returned only once in the response.",
        body: [
          { name: "name", type: "string", description: "Label for the API key", required: true },
          { name: "expiresAt", type: "ISO 8601", description: "Expiration date (optional)" },
        ],
        response: "ApiKey & { key: string }",
      },
      {
        method: "PATCH",
        path: "/api/api-keys/:id",
        description: "Update an API key's name.",
        body: [
          { name: "name", type: "string", description: "New name for the key", required: true },
        ],
        response: "ApiKey",
      },
      {
        method: "DELETE",
        path: "/api/api-keys/:id",
        description: "Revoke an API key. This cannot be undone.",
        response: "{ success: true }",
      },
    ],
  },
];

// --- Helper Components ---

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[60px] items-center justify-center rounded px-2 py-0.5 text-xs font-bold",
        methodColors[method] || "bg-gray-100 text-gray-800"
      )}
    >
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails =
    (endpoint.params && endpoint.params.length > 0) ||
    (endpoint.body && endpoint.body.length > 0) ||
    endpoint.response;

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => hasDetails && setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          hasDetails && "cursor-pointer hover:bg-muted/50"
        )}
      >
        <MethodBadge method={endpoint.method} />
        <code className="flex-shrink-0 text-sm font-medium">
          {endpoint.path}
        </code>
        <span className="flex-1 truncate text-sm text-muted-foreground">
          {endpoint.description}
        </span>
        {hasDetails && (
          <span className="flex-shrink-0 text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </button>

      {isOpen && hasDetails && (
        <div className="space-y-4 border-t bg-muted/30 px-4 py-4">
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Query Parameters
              </h4>
              <div className="space-y-1">
                {endpoint.params.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">
                      {param.name}
                    </code>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {param.type}
                    </span>
                    {param.required && (
                      <Badge variant="outline" className="text-[10px]">
                        required
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {param.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Request Body (JSON)
              </h4>
              <div className="space-y-1">
                {endpoint.body.map((field) => (
                  <div key={field.name} className="flex items-start gap-2 text-sm">
                    <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">
                      {field.name}
                    </code>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {field.type}
                    </span>
                    {field.required && (
                      <Badge variant="outline" className="text-[10px]">
                        required
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {field.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.response && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Response
              </h4>
              <code className="text-sm">{endpoint.response}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function ApiDocsPage() {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-instance.com";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="text-lg text-muted-foreground">
          Programmatic access to your Fluid Calendar data. All endpoints require
          authentication.
        </p>
      </div>

      {/* Authentication Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            All API requests must include a valid API key in the Authorization
            header using Bearer token authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Getting an API Key</h3>
            <p className="text-sm text-muted-foreground">
              Create an API key from the{" "}
              <a
                href="/settings#api-keys"
                className="text-primary hover:underline"
              >
                Settings &rarr; API Keys
              </a>{" "}
              page. The key is shown once at creation time — store it securely.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Making Requests</h3>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{`curl -X GET "${baseUrl}/api/tasks" \\
  -H "Authorization: Bearer fc_your_api_key_here" \\
  -H "Content-Type: application/json"`}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() =>
                  handleCopy(
                    `curl -X GET "${baseUrl}/api/tasks" \\\n  -H "Authorization: Bearer fc_your_api_key_here" \\\n  -H "Content-Type: application/json"`
                  )
                }
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Error Responses</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">401</code>{" "}
                — Missing or invalid API key
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">400</code>{" "}
                — Invalid request body or parameters
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">404</code>{" "}
                — Resource not found or not owned by you
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">429</code>{" "}
                — Rate limit exceeded (API key requests: 100/minute)
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">500</code>{" "}
                — Internal server error
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Rate Limits</h3>
            <p className="text-sm text-muted-foreground">
              API key requests are rate-limited to <strong>100 requests per minute</strong> per
              key. The following headers are included in every response:
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">X-RateLimit-Limit</code>{" "}
                — Maximum requests per window
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">X-RateLimit-Remaining</code>{" "}
                — Remaining requests in current window
              </p>
              <p>
                <code className="rounded bg-muted px-1.5 py-0.5">X-RateLimit-Reset</code>{" "}
                — Unix timestamp when the window resets
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mb-8 flex flex-wrap gap-2">
        {endpointGroups.map((group) => (
          <a
            key={group.title}
            href={`#${group.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-sm text-primary hover:underline"
          >
            {group.title}
          </a>
        ))}
      </div>

      {/* Endpoint Groups */}
      <div className="space-y-8">
        {endpointGroups.map((group) => (
          <Card
            key={group.title}
            id={group.title.toLowerCase().replace(/\s+/g, "-")}
          >
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {group.endpoints.map((endpoint, idx) => (
                  <EndpointCard key={`${endpoint.method}-${endpoint.path}-${idx}`} endpoint={endpoint} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          Need to create an API key?{" "}
          <a
            href="/settings#api-keys"
            className="text-primary hover:underline"
          >
            Go to Settings &rarr; API Keys
          </a>
        </p>
      </div>
    </div>
  );
}
