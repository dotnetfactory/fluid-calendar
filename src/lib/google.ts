import { google } from "googleapis";

import { getGoogleCredentials } from "./auth";

export async function createGoogleOAuthClient(options?: {
  redirectUrl?: string;
}) {
  const credentials = await getGoogleCredentials();
  return new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    options?.redirectUrl
  );
}
