"use client";

import { useQuery } from "@tanstack/react-query";

interface CalendarProviderCountResponse {
  count: number;
}

async function fetchCalendarProviderCount(): Promise<CalendarProviderCountResponse> {
  const response = await fetch("/api/calendar-providers/count");

  if (!response.ok) {
    throw new Error("Failed to fetch calendar provider count");
  }

  return response.json();
}

export function useCalendarProviderCount() {
  return useQuery({
    queryKey: ["calendar-provider-count"],
    queryFn: fetchCalendarProviderCount,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
