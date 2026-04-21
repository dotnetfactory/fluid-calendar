"use client";

import { useState } from "react";

import { BsGoogle, BsMicrosoft, BsTrash } from "react-icons/bs";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { CalendarFeed } from "@/types/calendar";

import { SettingsSection } from "./SettingsSection";
import { DeleteCalendarFeedDialog } from "./DeleteCalendarFeedDialog";

function FeedTypeIcon({ type }: { type: CalendarFeed["type"] }) {
  if (type === "GOOGLE") {
    return <BsGoogle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (type === "OUTLOOK") {
    return <BsMicrosoft className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  return null;
}

export function ManageCalendarFeeds() {
  const { feeds } = useCalendarStore();
  const taskCalendarId = useSettingsStore((s) => s.calendar.taskCalendarId);
  const [feedToDelete, setFeedToDelete] = useState<CalendarFeed | null>(null);

  return (
    <>
      <SettingsSection
        title="Manage Calendars"
        description="Remove calendar feeds you no longer want synced. To add a new calendar, use the Accounts tab."
      >
        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calendars connected yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {feeds.map((feed) => (
              <li
                key={feed.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: feed.color || "hsl(var(--primary))",
                    }}
                  />
                  <span className="truncate text-sm text-foreground">
                    {feed.name}
                  </span>
                  <FeedTypeIcon type={feed.type} />
                  {feed.id === taskCalendarId && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Task Calendar
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFeedToDelete(feed)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-destructive focus:outline-none"
                  aria-label={`Delete ${feed.name}`}
                >
                  <BsTrash className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <DeleteCalendarFeedDialog
        isOpen={feedToDelete !== null}
        onClose={() => setFeedToDelete(null)}
        feed={feedToDelete}
        isTaskCalendar={
          feedToDelete !== null && feedToDelete.id === taskCalendarId
        }
      />
    </>
  );
}
