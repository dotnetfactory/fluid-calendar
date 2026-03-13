import { useEffect } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function CalendarSettings() {
  const { calendar, updateCalendarSettings, user, updateUserSettings } =
    useSettingsStore();
  const { feeds, loadFromDatabase } = useCalendarStore();

  // Load feeds when component mounts
  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const workingDays = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  return (
    <SettingsSection
      title="Calendar Settings"
      description="Configure your calendar display and event defaults."
    >
      <SettingRow
        label="Default Calendar"
        description="Choose which calendar new events are added to by default"
      >
        <Select
          value={calendar.defaultCalendarId || "none"}
          onValueChange={(value) =>
            updateCalendarSettings({
              defaultCalendarId: value === "none" ? "" : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a default calendar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select a default calendar</SelectItem>
            {feeds
              .filter((feed) => feed.enabled)
              .map((feed) => (
                <SelectItem key={feed.id} value={feed.id}>
                  {feed.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Week Start Day"
        description="Set which day of the week your calendar should start on"
      >
        <Select
          value={user.weekStartDay}
          onValueChange={(value) =>
            updateUserSettings({
              weekStartDay: value as "monday" | "sunday",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select start day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunday">Sunday</SelectItem>
            <SelectItem value="monday">Monday</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Working Hours"
        description="Set your working hours for better calendar visualization"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-working-hours"
              checked={calendar.workingHours.enabled}
              onCheckedChange={(checked) =>
                updateCalendarSettings({
                  workingHours: {
                    ...calendar.workingHours,
                    enabled: checked as boolean,
                  },
                })
              }
            />
            <Label htmlFor="show-working-hours">Show working hours</Label>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={calendar.workingHours.start}
                onChange={(e) =>
                  updateCalendarSettings({
                    workingHours: {
                      ...calendar.workingHours,
                      start: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="flex-1">
              <Label>End Time</Label>
              <Input
                type="time"
                value={calendar.workingHours.end}
                onChange={(e) =>
                  updateCalendarSettings({
                    workingHours: {
                      ...calendar.workingHours,
                      end: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label>Working Days</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {workingDays.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={calendar.workingHours.days.includes(day.value)}
                    onCheckedChange={(checked) => {
                      const days = checked
                        ? [...calendar.workingHours.days, day.value]
                        : calendar.workingHours.days.filter(
                            (d) => d !== day.value
                          );
                      updateCalendarSettings({
                        workingHours: {
                          ...calendar.workingHours,
                          days,
                        },
                      });
                    }}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
