import { useCallback, useState } from "react";

import { BsArrowRepeat, BsGoogle, BsMicrosoft, BsTrash } from "react-icons/bs";

import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";

import { MiniCalendar } from "./MiniCalendar";

export function FeedManager() {
  const [syncingFeeds, setSyncingFeeds] = useState<Set<string>>(new Set());
  const { feeds, removeFeed, toggleFeed, syncFeed } = useCalendarStore();
  const { date: currentDate, setDate } = useViewStore();

  const handleRemoveFeed = useCallback(
    async (feedId: string) => {
      try {
        await removeFeed(feedId);
      } catch (error) {
        console.error("Failed to remove feed:", error);
      }
    },
    [removeFeed]
  );

  const handleSyncFeed = useCallback(
    async (feedId: string) => {
      if (syncingFeeds.has(feedId)) return;

      try {
        setSyncingFeeds((prev) => new Set(prev).add(feedId));
        await syncFeed(feedId);
      } finally {
        setSyncingFeeds((prev) => {
          const next = new Set(prev);
          next.delete(feedId);
          return next;
        });
      }
    },
    [syncFeed, syncingFeeds]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border py-4">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">Your Calendars</h3>
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={feed.enabled}
                  onCheckedChange={() => toggleFeed(feed.id)}
                  className="h-4 w-4"
                />
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: feed.color || "hsl(var(--primary))",
                  }}
                />
                <span className="calendar-name max-w-[150px] truncate text-sm text-foreground">
                  {feed.name}
                </span>
                {feed.type === "GOOGLE" && (
                  <BsGoogle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                {feed.type === "OUTLOOK" && (
                  <BsMicrosoft className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSyncFeed(feed.id)}
                  disabled={syncingFeeds.has(feed.id)}
                  className={cn(
                    "rounded-full p-1.5 text-muted-foreground hover:text-foreground",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2",
                    "focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    "disabled:opacity-50"
                  )}
                >
                  <BsArrowRepeat
                    className={cn(
                      "h-3.5 w-3.5",
                      syncingFeeds.has(feed.id) && "animate-spin"
                    )}
                  />
                </button>
                <button
                  onClick={() => handleRemoveFeed(feed.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  <BsTrash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {feeds.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No calendars added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
