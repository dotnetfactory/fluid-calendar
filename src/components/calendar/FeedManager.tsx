import { useCallback, useRef, useState } from "react";

import { BsArrowRepeat, BsGoogle, BsMicrosoft, BsTrash } from "react-icons/bs";

import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";

import { MiniCalendar } from "./MiniCalendar";

export function FeedManager() {
  const [syncingFeeds, setSyncingFeeds] = useState<Set<string>>(new Set());
  const { feeds, removeFeed, toggleFeed, syncFeed, updateFeed } = useCalendarStore();
  const { date: currentDate, setDate } = useViewStore();
  const colorInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const handleColorChange = useCallback(
    async (feedId: string, color: string) => {
      try {
        await updateFeed(feedId, { color });
      } catch (error) {
        console.error("Failed to update feed color:", error);
      }
    },
    [updateFeed]
  );

  const handleColorClick = useCallback((feedId: string) => {
    // Trigger the hidden color input
    const colorInput = colorInputRefs.current[feedId];
    if (colorInput) {
      colorInput.click();
    }
  }, []);

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
                <div className="relative">
                  <button
                    onClick={() => handleColorClick(feed.id)}
                    className="group relative h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{
                      backgroundColor: feed.color || "hsl(var(--primary))",
                    }}
                  />
                  <input
                    ref={(el) => {
                      colorInputRefs.current[feed.id] = el;
                    }}
                    type="color"
                    value={feed.color || "#3b82f6"}
                    onChange={(e) => handleColorChange(feed.id, e.target.value)}
                    className="absolute left-0 top-0 h-0 w-0 opacity-0"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
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
