import { prisma } from "@/lib/prisma";

export async function getGoogleCredentials() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings) {
      return {
        clientId: settings.googleClientId || process.env.GOOGLE_CLIENT_ID!,
        clientSecret:
          settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET!,
      };
    }
  } catch (error) {
    console.error("Failed to get system settings:", error);
  }

  // Fallback to environment variables
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  };
}

export async function getOutlookCredentials() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings) {
      return {
        clientId: settings.outlookClientId || process.env.AZURE_AD_CLIENT_ID!,
        clientSecret:
          settings.outlookClientSecret || process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId:
          settings.outlookTenantId ||
          process.env.AZURE_AD_TENANT_ID ||
          "common",
      };
    }
  } catch (error) {
    console.error("Failed to get system settings:", error);
  }

  // Fallback to environment variables
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Outlook credentials. Please add credentials in System Settings or in .env file"
    );
  }

  return {
    clientId,
    clientSecret,
    tenantId: tenantId || "common",
  };
}
