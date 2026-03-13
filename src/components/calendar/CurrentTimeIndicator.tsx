import { useEffect, useState } from "react";

import { isSameDay, newDate } from "@/lib/date-utils";

interface CurrentTimeIndicatorProps {
  date: Date;
}

export function CurrentTimeIndicator({ date }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(newDate());

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setNow(newDate());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!isSameDay(date, now)) {
    return null;
  }

  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const percentage = (minutesSinceMidnight / 1440) * 100; // 1440 = minutes in a day

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ top: `${percentage}%` }}
    >
      {/* Time label */}
      <div className="absolute -left-16 w-12 -translate-y-1/2 text-right">
        <span className="text-xs font-medium text-red-500">
          {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      {/* Line */}
      <div className="relative h-px w-full bg-red-500">
        {/* Circle */}
        <div className="absolute left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
