// Booking types — OS stubs (no Prisma dependency in OS mode)

export type BookingDuration = 15 | 30 | 45 | 60;
export type VideoProvider = "google_meet" | "zoom" | null;
export type AvailabilityType = "working_hours" | "custom";
export type BookingStatus = "confirmed" | "cancelled";

export interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface CustomAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

export interface AvailableSlots {
  date: string;
  slots: TimeSlot[];
}

export interface CreateBookingLinkInput {
  name: string;
  slug: string;
  description?: string;
  duration: BookingDuration;
  selectedCalendars: string[];
  targetCalendarId: string;
  availabilityType?: AvailabilityType;
  customAvailability?: CustomAvailability;
  bufferBefore?: number;
  bufferAfter?: number;
  minNotice?: number;
  maxFutureDays?: number;
  videoProvider?: VideoProvider;
}

export interface UpdateBookingLinkInput {
  name?: string;
  slug?: string;
  description?: string;
  duration?: BookingDuration;
  selectedCalendars?: string[];
  targetCalendarId?: string;
  availabilityType?: AvailabilityType;
  customAvailability?: CustomAvailability;
  bufferBefore?: number;
  bufferAfter?: number;
  minNotice?: number;
  maxFutureDays?: number;
  videoProvider?: VideoProvider;
  enabled?: boolean;
}

export interface CreateBookingInput {
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  guestTimezone: string;
  startTime: string;
}

export interface PublicBookingLinkInfo {
  name: string;
  description?: string;
  duration: number;
  hostName: string;
  enabled: boolean;
}

export interface AvailabilityRequest {
  startDate: string;
  endDate: string;
  timezone: string;
}

export interface UsernameValidationResult {
  available: boolean;
  reason?: string;
}

export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "app",
  "auth",
  "book",
  "booking",
  "calendar",
  "dashboard",
  "help",
  "login",
  "logout",
  "profile",
  "settings",
  "signup",
  "support",
  "user",
  "users",
  "www",
];

export interface BookingFeatureAccess {
  canCreateBookingLink: boolean;
  canUseVideoConferencing: boolean;
  canUseBufferTime: boolean;
  canUseCustomAvailability: boolean;
  maxBookingLinks: number | null;
}
