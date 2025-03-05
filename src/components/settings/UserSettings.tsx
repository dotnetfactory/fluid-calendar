import { useSettingsStore } from "@/store/settings";
import { SettingsSection, SettingRow } from "./SettingsSection";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { TimeFormat, WeekStartDay } from "@/types/settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserSettings() {
  const { data: session } = useSession();
  const { user, updateUserSettings } = useSettingsStore();

  const timeFormats: { value: TimeFormat; label: string }[] = [
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" },
  ];

  const weekStarts: { value: WeekStartDay; label: string }[] = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
  ];

  // Static list of common timezones
  const timeZones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  return (
    <SettingsSection
      title="User Settings"
      description="Manage your personal preferences for the calendar application."
    >
      {session?.user && (
        <SettingRow label="Profile" description="Your account information">
          <div className="flex items-center space-x-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || ""}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <div className="font-medium">{session.user.name}</div>
              <div className="text-sm text-muted-foreground">
                {session.user.email}
              </div>
            </div>
          </div>
        </SettingRow>
      )}

      <SettingRow
        label="Time Format"
        description="Choose how times are displayed"
      >
        <Select
          value={user.timeFormat}
          onValueChange={(value) =>
            updateUserSettings({ timeFormat: value as TimeFormat })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeFormats.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Week Starts On"
        description="Choose which day your week starts on"
      >
        <Select
          value={user.weekStartDay}
          onValueChange={(value) =>
            updateUserSettings({ weekStartDay: value as WeekStartDay })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weekStarts.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Time Zone"
        description="Your current time zone setting"
      >
        <Select
          value={user.timeZone}
          onValueChange={(value) => updateUserSettings({ timeZone: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeZones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </SettingsSection>
  );
}
