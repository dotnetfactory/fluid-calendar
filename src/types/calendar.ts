export interface CalendarFeed {
  id: string;
  name: string;
  url?: string; // Make optional since local calendar won't have URL
  type: "LOCAL" | "GOOGLE" | "OUTLOOK";
  color?: string;
  enabled: boolean;
  lastSync?: Date;
  error?: string;
}

export interface ExtendedEventProps {
  isTask?: boolean;
  taskId?: string;
  status?: string;
  energyLevel?: string;
  preferredTime?: string;
  tags?: Array<{ id: string; name: string; color?: string }>;
}

export interface CalendarEvent {
  id: string;
  feedId: string;
  externalEventId?: string;
  outlookEventId?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  allDay: boolean;
  color?: string;
  // Additional fields for iCal support
  uid?: string; // Unique identifier from iCal
  sequence?: number; // Modification sequence
  status?: EventStatus; // Event status (confirmed, cancelled, etc.)
  created?: Date; // Creation timestamp
  lastModified?: Date; // Last modification timestamp
  organizer?: {
    name?: string;
    email?: string;
  };
  attendees?: Array<{
    name?: string;
    email: string;
    status?: AttendeeStatus;
  }>;
  // New fields for hybrid approach
  isMaster: boolean;
  masterEventId?: string;
  recurringEventId?: string;
  // Extended properties for custom data
  extendedProps?: ExtendedEventProps;
}

export enum EventStatus {
  CONFIRMED = "CONFIRMED",
  TENTATIVE = "TENTATIVE",
  CANCELLED = "CANCELLED",
}

export enum AttendeeStatus {
  ACCEPTED = "ACCEPTED",
  TENTATIVE = "TENTATIVE",
  DECLINED = "DECLINED",
  NEEDS_ACTION = "NEEDS-ACTION",
}

export interface CalendarState {
  feeds: CalendarFeed[];
  events: CalendarEvent[];
  isLoading: boolean;
  error?: string;
}

export type CalendarView = "day" | "week" | "month" | "agenda";

export interface CalendarViewState {
  view: CalendarView;
  date: Date;
  selectedEventId?: string;
}
