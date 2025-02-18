import { useState, useCallback } from "react";
import { useCalendarStore } from "@/store/calendar";
import { BsTrash, BsArrowRepeat, BsGoogle, BsMicrosoft } from "react-icons/bs";
import { cn } from "@/lib/utils";

export function FeedManager() {
  const [syncingFeeds, setSyncingFeeds] = useState<Set<string>>(new Set());
  const { feeds, removeFeed, toggleFeed, syncFeed } = useCalendarStore();

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
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900">Your Calendars</h3>
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feed.enabled}
                onChange={() => toggleFeed(feed.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-gray-900">{feed.name}</span>
              {feed.type === "GOOGLE" && (
                <BsGoogle className="w-4 h-4 text-gray-500" />
              )}
              {feed.type === "OUTLOOK" && (
                <BsMicrosoft className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSyncFeed(feed.id)}
                disabled={syncingFeeds.has(feed.id)}
                className={cn(
                  "p-1.5 text-gray-500 hover:text-gray-700 rounded-full",
                  "hover:bg-gray-100 focus:outline-none focus:ring-2",
                  "focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:opacity-50"
                )}
              >
                <BsArrowRepeat
                  className={cn(
                    "w-4 h-4",
                    syncingFeeds.has(feed.id) && "animate-spin"
                  )}
                />
              </button>
              <button
                onClick={() => handleRemoveFeed(feed.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <BsTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {feeds.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No calendars added yet
          </p>
        )}
      </div>
    </div>
  );
}
