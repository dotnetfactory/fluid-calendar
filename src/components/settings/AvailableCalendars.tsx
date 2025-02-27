import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div className="p-4 text-center text-gray-500">
        Loading available calendars...
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No available calendars found
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      <div className="space-y-2">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center justify-between p-4 bg-white border rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {calendar.accessRole || (calendar.canEdit ? "owner" : "reader")}
              </Badge>
              <span>{calendar.name}</span>
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
