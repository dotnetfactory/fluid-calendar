"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useCalendarStore } from "@/store/calendar";

import { CalendarFeed } from "@/types/calendar";

interface DeleteCalendarFeedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feed: CalendarFeed | null;
  isTaskCalendar: boolean;
}

export function DeleteCalendarFeedDialog({
  isOpen,
  onClose,
  feed,
  isTaskCalendar,
}: DeleteCalendarFeedDialogProps) {
  const { removeFeed } = useCalendarStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!feed) return;
    setIsDeleting(true);
    try {
      await removeFeed(feed.id);
      onClose();
    } catch (error) {
      console.error("Failed to remove feed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Calendar</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Remove{" "}
                <strong className="text-foreground">{feed?.name}</strong> from
                FluidCalendar? Events from this calendar will disappear from
                your view. You can re-add it later from the Accounts tab.
              </p>
              {isTaskCalendar && (
                <p className="font-medium text-destructive">
                  This is your Task Calendar. Removing it will break the
                  auto-schedule push to Google Calendar until you select a new
                  one in settings.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-9 items-center justify-center rounded-md bg-muted px-4 text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Calendar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
