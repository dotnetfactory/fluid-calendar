"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { CalendarEvent } from "@/types/calendar";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { IoClose } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { formatToLocalISOString } from "@/lib/date-utils";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Partial<CalendarEvent>;
  defaultDate?: Date;
  defaultEndDate?: Date;
}

// Google Calendar recurrence rules
const FREQUENCIES = {
  NONE: "",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

const WEEKDAYS = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
} as const;

// Helper function to parse recurrence rule
function parseRecurrenceRule(rule?: string) {
  if (!rule) return { freq: "", interval: 1, byDay: [] };

  // Remove RRULE: prefix and any array wrapper
  rule = rule.replace(/^\[?"?RRULE:/i, "").replace(/"?\]?$/, "");

  const parts = rule.split(";");
  const result = {
    freq: "",
    interval: 1,
    byDay: [] as string[],
  };

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",");
        break;
    }
  });

  return result;
}

// Helper function to build recurrence rule
function buildRecurrenceRule(freq: string, interval: number, byDay: string[]) {
  if (!freq) return "";

  const parts = [];

  // Add frequency
  if (Object.values(FREQUENCIES).includes(freq as Frequency)) {
    parts.push(`FREQ=${freq}`);
  }

  // Add interval if greater than 1
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  // Add BYDAY for weekly recurrence
  if (freq === FREQUENCIES.WEEKLY && byDay.length > 0) {
    parts.push(`BYDAY=${byDay.join(",")}`);
  }

  // Return empty string if no valid parts
  if (parts.length === 0) return "";

  // Don't add RRULE: prefix - it will be added in createGoogleEvent
  return parts.join(";");
}

export function EventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
  defaultEndDate,
}: EventModalProps) {
  const { feeds, addEvent, updateEvent, removeEvent } = useCalendarStore();
  const { calendar } = useSettingsStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "series">();
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startDate, setStartDate] = useState<Date>(
    event?.start
      ? new Date(event.start)
      : defaultDate
      ? new Date(defaultDate)
      : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    event?.end
      ? new Date(event.end)
      : defaultEndDate
      ? new Date(defaultEndDate)
      : new Date(Date.now() + 3600000)
  );
  const [selectedFeedId, setSelectedFeedId] = useState<string>(
    event?.feedId ||
      calendar.defaultCalendarId ||
      feeds.find((f) => f.type === "LOCAL")?.id ||
      ""
  );
  const [isAllDay, setIsAllDay] = useState(event?.allDay || false);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring || false);
  const [recurrenceFreq, setRecurrenceFreq] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(event?.title || "");
      setDescription(event?.description || "");
      setLocation(event?.location || "");
      setStartDate(
        event?.start
          ? new Date(event.start)
          : defaultDate
          ? new Date(defaultDate)
          : new Date()
      );
      setEndDate(
        event?.end
          ? new Date(event.end)
          : defaultEndDate
          ? new Date(defaultEndDate)
          : new Date(Date.now() + 3600000)
      );
      setSelectedFeedId(
        event?.feedId ||
          calendar.defaultCalendarId ||
          feeds.find((f) => f.type === "LOCAL")?.id ||
          ""
      );
      setIsAllDay(event?.allDay || false);
      setIsRecurring(event?.isRecurring || false);
      const { freq, interval, byDay } = parseRecurrenceRule(
        event?.recurrenceRule
      );
      setRecurrenceFreq(freq || "");
      setRecurrenceInterval(interval);
      setRecurrenceByDay(byDay);
      setEditMode(undefined);
      setShowRecurrenceDialog(false);

      // Focus the title input
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [
    isOpen,
    event,
    defaultDate,
    defaultEndDate,
    feeds,
    calendar.defaultCalendarId,
  ]);

  // Show recurrence dialog when editing a recurring event
  useEffect(() => {
    if (isOpen && event?.isRecurring && !editMode && !showRecurrenceDialog) {
      setShowRecurrenceDialog(true);
    }
  }, [isOpen, event?.isRecurring, editMode, showRecurrenceDialog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const feed = feeds.find((f) => f.id === selectedFeedId);
    if (!feed) {
      console.error("Selected calendar not found");
      return;
    }

    const eventData: Omit<CalendarEvent, "id"> = {
      title,
      description,
      location,
      start: startDate,
      end: endDate,
      feedId: selectedFeedId,
      allDay: isAllDay,
      isRecurring,
      recurrenceRule: isRecurring
        ? buildRecurrenceRule(
            recurrenceFreq,
            recurrenceInterval,
            recurrenceByDay
          )
        : undefined,
      isMaster: false,
    };

    try {
      if (event?.id) {
        // For existing events
        if (feed.type === "GOOGLE" && !event.externalEventId) {
          throw new Error("Cannot edit this Google Calendar event");
        }
        await updateEvent(event.id, eventData, editMode);
      } else {
        // For new events
        await addEvent(eventData);
      }
      // Reset all states before closing
      resetState();
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert(error instanceof Error ? error.message : "Failed to save event");
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;

    try {
      await removeEvent(event.id, editMode);
      resetState();
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event");
    }
  };

  // Render the recurrence options
  const renderRecurrenceOptions = () => {
    if (!isRecurring) return null;

    return (
      <div className="space-y-4">
        <div>
          <label
            htmlFor="recurrence-freq"
            className="block text-sm font-medium text-gray-700"
          >
            Repeats
          </label>
          <select
            id="recurrence-freq"
            data-testid="recurrence-freq"
            value={recurrenceFreq}
            onChange={(e) => setRecurrenceFreq(e.target.value)}
            className={cn(
              "mt-1 block w-full rounded-md border-gray-300",
              "shadow-sm focus:border-blue-500 focus:ring-blue-500",
              "text-sm"
            )}
          >
            <option value="">Select frequency</option>
            <option value={FREQUENCIES.DAILY}>Daily</option>
            <option value={FREQUENCIES.WEEKLY}>Weekly</option>
            <option value={FREQUENCIES.MONTHLY}>Monthly</option>
            <option value={FREQUENCIES.YEARLY}>Yearly</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="recurrence-interval"
            className="block text-sm font-medium text-gray-700"
          >
            Repeat every
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="recurrence-interval"
              min="1"
              value={recurrenceInterval}
              onChange={(e) =>
                setRecurrenceInterval(Math.max(1, parseInt(e.target.value, 10)))
              }
              className={cn(
                "mt-1 block w-20 rounded-md border-gray-300",
                "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                "text-sm"
              )}
            />
            <span className="text-sm text-gray-600">
              {recurrenceFreq.toLowerCase()}
              {recurrenceInterval > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {recurrenceFreq === FREQUENCIES.WEEKLY && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat on
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(WEEKDAYS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={recurrenceByDay.includes(key)}
                    onChange={(e) => {
                      setRecurrenceByDay(
                        e.target.checked
                          ? [...recurrenceByDay, key]
                          : recurrenceByDay.filter((d) => d !== key)
                      );
                    }}
                    className={cn(
                      "rounded border-gray-300 text-blue-600",
                      "focus:ring-blue-500 focus:ring-offset-0",
                      "h-4 w-4"
                    )}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg z-[10000]"
            data-testid="event-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">
                {event?.id ? "Edit Event" : "New Event"}
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100">
                <IoClose className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  ref={titleInputRef}
                  data-testid="event-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300",
                    "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                    "text-sm"
                  )}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="calendar"
                  className="block text-sm font-medium text-gray-700"
                >
                  Calendar
                </label>
                <select
                  id="calendar"
                  data-testid="calendar-select"
                  value={selectedFeedId}
                  onChange={(e) => setSelectedFeedId(e.target.value)}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300",
                    "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                    "text-sm"
                  )}
                  required
                  disabled={!!event?.id}
                >
                  <option value="">Select a calendar</option>
                  {feeds
                    .filter((feed) => feed.enabled)
                    .map((feed) => (
                      <option key={feed.id} value={feed.id}>
                        {feed.name} {feed.type === "GOOGLE" ? "(Google)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="start"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    id="start"
                    data-testid="event-start-date"
                    value={formatToLocalISOString(startDate)}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className={cn(
                      "mt-1 block w-full rounded-md border-gray-300",
                      "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                      "text-sm",
                      "[&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
                      "[&::-webkit-datetime-edit-fields-wrapper]:p-1",
                      "min-w-0"
                    )}
                    required
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="end"
                    className="block text-sm font-medium text-gray-700"
                  >
                    End
                  </label>
                  <input
                    type="datetime-local"
                    id="end"
                    data-testid="event-end-date"
                    value={formatToLocalISOString(endDate)}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className={cn(
                      "mt-1 block w-full rounded-md border-gray-300",
                      "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                      "text-sm",
                      "[&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
                      "[&::-webkit-datetime-edit-fields-wrapper]:p-1",
                      "min-w-0"
                    )}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className={cn(
                      "rounded border-gray-300 text-blue-600",
                      "focus:ring-blue-500 focus:ring-offset-0",
                      "h-4 w-4"
                    )}
                  />
                  <span className="text-sm text-gray-700">All day</span>
                </label>
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300",
                    "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                    "text-sm"
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  data-testid="event-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300",
                    "shadow-sm focus:border-blue-500 focus:ring-blue-500",
                    "text-sm resize-none"
                  )}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      setIsRecurring(e.target.checked);
                      if (e.target.checked && !recurrenceFreq) {
                        setRecurrenceFreq(FREQUENCIES.WEEKLY);
                        setRecurrenceByDay([
                          new Date()
                            .toLocaleString("en-US", { weekday: "short" })
                            .toUpperCase()
                            .slice(0, 2),
                        ]);
                      }
                    }}
                    data-testid="recurring-event-checkbox"
                    className={cn(
                      "rounded border-gray-300 text-blue-600",
                      "focus:ring-blue-500 focus:ring-offset-0",
                      "h-4 w-4"
                    )}
                  />
                  <span className="text-sm text-gray-700">Recurring event</span>
                </label>
              </div>

              {renderRecurrenceOptions()}

              <div className="flex justify-between items-center pt-4">
                {event?.id ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    data-testid="delete-event-button"
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium",
                      "text-red-600 hover:bg-red-50",
                      "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    )}
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium",
                      "text-gray-700 hover:bg-gray-100",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="save-event-button"
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium",
                      "bg-blue-600 text-white hover:bg-blue-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    )}
                  >
                    {event?.id ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Recurring Event Edit Mode Dialog */}
      <AlertDialog.Root
        open={showRecurrenceDialog}
        onOpenChange={(open) => {
          setShowRecurrenceDialog(open);
          if (!open) onClose(); // Close both dialogs when canceling
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg z-[10002]">
            <AlertDialog.Title className="text-lg font-semibold mb-4">
              Edit Recurring Event
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 mb-6">
              Would you like to edit this event or the entire series?
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium",
                  "text-gray-700 hover:bg-gray-100",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
                data-testid="edit-cancel-button"
              >
                Cancel
              </AlertDialog.Cancel>
              <button
                onClick={() => {
                  setEditMode("single");
                  setShowRecurrenceDialog(false);
                }}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
                data-testid="edit-single-event-button"
              >
                This Event
              </button>
              <button
                onClick={() => {
                  setEditMode("series");
                  setShowRecurrenceDialog(false);
                }}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
                data-testid="edit-series-button"
              >
                Entire Series
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );

  function resetState() {
    setShowRecurrenceDialog(false);
    setEditMode(undefined);
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 3600000));
    setIsAllDay(false);
    setIsRecurring(false);
    setRecurrenceFreq("");
    setRecurrenceInterval(1);
    setRecurrenceByDay([]);
  }
}
