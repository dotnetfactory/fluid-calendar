import { useState, useCallback } from "react";
import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";
import { BsTrash, BsArrowRepeat, BsGoogle, BsMicrosoft } from "react-icons/bs";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "./MiniCalendar";
import { Checkbox } from "@/components/ui/checkbox";

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
    <div className="flex flex-col h-full bg-background">
      <div className="py-4 border-b border-border">
        <MiniCalendar currentDate={currentDate} onDateClick={setDate} />
      </div>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">Your Calendars</h3>
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={feed.enabled}
                  onCheckedChange={() => toggleFeed(feed.id)}
                  className="h-4 w-4"
                />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: feed.color || "hsl(var(--primary))",
                  }}
                />
                <span className="text-sm text-foreground calendar-name">
                  {feed.name}
                </span>
                {feed.type === "GOOGLE" && (
                  <BsGoogle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                {feed.type === "OUTLOOK" && (
                  <BsMicrosoft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSyncFeed(feed.id)}
                  disabled={syncingFeeds.has(feed.id)}
                  className={cn(
                    "p-1.5 text-muted-foreground hover:text-foreground rounded-full",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2",
                    "focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    "disabled:opacity-50"
                  )}
                >
                  <BsArrowRepeat
                    className={cn(
                      "w-3.5 h-3.5",
                      syncingFeeds.has(feed.id) && "animate-spin"
                    )}
                  />
                </button>
                <button
                  onClick={() => handleRemoveFeed(feed.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  <BsTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {feeds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No calendars added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
