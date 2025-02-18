// Microsoft Graph API configuration
export const MICROSOFT_GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export const MICROSOFT_GRAPH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "User.Read",
];

export const MICROSOFT_GRAPH_AUTH_ENDPOINTS = {
  auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

// Types for Microsoft Graph API responses
export interface MSGraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

export interface MSGraphCalendar {
  id: string;
  name: string;
  color?: string;
  canEdit?: boolean;
  owner?: {
    name: string;
    address: string;
  };
  changeKey?: string;
}

export interface MSGraphEvent {
  id: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
  };
  attendees?: {
    emailAddress: {
      name: string;
      address: string;
    };
    type: "required" | "optional";
    status: {
      response: "none" | "accepted" | "tentative" | "declined";
      time: string;
    };
  }[];
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
      month?: number;
      dayOfMonth?: number;
      daysOfWeek?: string[];
      firstDayOfWeek?: string;
      index?: string;
    };
    range: {
      type: string;
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  isAllDay?: boolean;
  isCancelled?: boolean;
  isOrganizer?: boolean;
  sensitivity?: "normal" | "personal" | "private" | "confidential";
  showAs?:
    | "free"
    | "tentative"
    | "busy"
    | "oof"
    | "workingElsewhere"
    | "unknown";
  categories?: string[];
  createdDateTime: string;
  lastModifiedDateTime: string;
  instances?: MSGraphEvent[];
  type?: "occurrence" | "exception" | "seriesMaster";
  seriesMasterId?: string;
}
