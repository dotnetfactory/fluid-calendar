import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AvailableCalendar {
  id: string;
  name: string;
  color: string;
  accessRole?: string;
  canEdit?: boolean;
  alreadyAdded?: boolean;
}

interface Props {
  accountId: string;
  provider: "GOOGLE" | "OUTLOOK" | "CALDAV";
}

export function AvailableCalendars({ accountId, provider }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [calendars, setCalendars] = useState<AvailableCalendar[]>([]);
  const [addingCalendars, setAddingCalendars] = useState<Set<string>>(
    new Set()
  );

  const loadAvailableCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      let endpoint;

      switch (provider) {
        case "GOOGLE":
          endpoint = `/api/calendar/google/available?accountId=${accountId}`;
          break;
        case "OUTLOOK":
          endpoint = `/api/calendar/outlook/available?accountId=${accountId}`;
          break;
        case "CALDAV":
          endpoint = `/api/calendar/caldav/available?accountId=${accountId}`;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch calendars");
      const data = await response.json();
      setCalendars(data);
    } catch (error) {
      console.error("Failed to load available calendars:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, provider]);

  // Load calendars when component mounts
  useEffect(() => {
    loadAvailableCalendars();
  }, [loadAvailableCalendars]);

  const handleAddCalendar = useCallback(
    async (calendar: AvailableCalendar) => {
      try {
        setAddingCalendars((prev) => new Set(prev).add(calendar.id));
        let endpoint;

        switch (provider) {
          case "GOOGLE":
            endpoint = "/api/calendar/google";
            break;
          case "OUTLOOK":
            endpoint = "/api/calendar/outlook/sync";
            break;
          case "CALDAV":
            endpoint = "/api/calendar/caldav";
            break;
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            calendarId: calendar.id,
            name: calendar.name,
            color: calendar.color,
          }),
        });

        if (!response.ok) throw new Error("Failed to add calendar");

        // Remove from available list
        setCalendars((prev) =>
          prev.filter((c) => {
            if (calendar.alreadyAdded) {
              return false;
            }
            if (c.id === calendar.id) {
              return false;
            }
            return true;
          })
        );
      } catch (error) {
        console.error("Failed to add calendar:", error);
      } finally {
        setAddingCalendars((prev) => {
          const next = new Set(prev);
          next.delete(calendar.id);
          return next;
        });
      }
    },
    [accountId, provider]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        No available calendars found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center justify-between rounded-md border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {calendar.accessRole?.toLowerCase() ||
                  (calendar.canEdit ? "owner" : "reader")}
              </Badge>
              <span className="text-sm">{calendar.name}</span>
            </div>
            <Button
              size="sm"
              onClick={() => handleAddCalendar(calendar)}
              disabled={addingCalendars.has(calendar.id)}
            >
              {addingCalendars.has(calendar.id) ? "Adding..." : "Add"}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={loadAvailableCalendars}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
