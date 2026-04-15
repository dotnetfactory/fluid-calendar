import { useCallback, useState } from "react";

import { BsArrowRepeat, BsGearFill, BsGoogle, BsMicrosoft, BsTrash } from "react-icons/bs";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useViewStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { MiniCalendar } from "./MiniCalendar";

export function FeedManager() {
  const [syncingFeeds, setSyncingFeeds] = useState<Set<string>>(new Set());
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);
  const { feeds, removeFeed, toggleFeed, syncFeed, updateFeed } = useCalendarStore();
  const { date: currentDate, setDate } = useViewStore();
  const taskCalendarId = useSettingsStore((s) => s.calendar.taskCalendarId);

  const handleRemoveFeed = useCallback(
    async (feedId: string) => {
      // Warn if deleting the Task Calendar feed
      if (feedId === taskCalendarId) {
        const confirmed = window.confirm(
          "This calendar is used for auto-scheduling task events. " +
          "Deleting it will break the auto-schedule to Google Calendar sync. Continue?"
        );
        if (!confirmed) return;
      }
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
            <div key={feed.id}>
              <div
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
                  <span className="calendar-name max-w-[130px] truncate text-sm text-foreground">
                    {feed.name}
                  </span>
                  {feed.type === "GOOGLE" && (
                    <BsGoogle className="h-3 w-3 flex-shrink-0 text-muted-foreground" title={feed.url} />
                  )}
                  {feed.type === "OUTLOOK" && (
                    <BsMicrosoft className="h-3 w-3 flex-shrink-0 text-muted-foreground" title={feed.url} />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {feed.id !== taskCalendarId && (
                    <>
                      <button
                        onClick={() => setExpandedFeed(expandedFeed === feed.id ? null : feed.id)}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground focus:outline-none"
                      >
                        <BsGearFill className={cn("h-3 w-3", expandedFeed === feed.id && "text-primary")} />
                      </button>
                      <button
                        onClick={() => handleSyncFeed(feed.id)}
                        disabled={syncingFeeds.has(feed.id)}
                        className={cn(
                          "rounded-full p-1.5 text-muted-foreground hover:text-foreground",
                          "hover:bg-muted/50 focus:outline-none",
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
                    </>
                  )}
                  <button
                    onClick={() => handleRemoveFeed(feed.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-destructive focus:outline-none"
                  >
                    <BsTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {expandedFeed === feed.id && (
                <div className="ml-10 mr-2 mb-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Auto Sync</label>
                    <Checkbox
                      checked={feed.autoSync}
                      onCheckedChange={(checked) =>
                        updateFeed(feed.id, { autoSync: checked as boolean })
                      }
                      className="h-3.5 w-3.5"
                    />
                  </div>
                  {feed.autoSync && (
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">Interval</label>
                      <Select
                        value={String(feed.syncInterval || 5)}
                        onValueChange={(value) =>
                          updateFeed(feed.id, { syncInterval: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="360">6 hours</SelectItem>
                          <SelectItem value="1440">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {feed.lastSync && (
                    <div className="text-[10px] text-muted-foreground">
                      Last synced: {new Date(feed.lastSync).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
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
