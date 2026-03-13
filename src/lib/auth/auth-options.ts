import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";
import { authenticateUser } from "@/lib/auth/credentials-provider";
import { logger } from "@/lib/logger";
import { MICROSOFT_GRAPH_SCOPES } from "@/lib/outlook";
import { prisma } from "@/lib/prisma";

// Define a type for our user with role
interface UserWithRole {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
}

const LOG_SOURCE = "AuthOptions";

// Create a function to get the auth options with the credentials
export async function getAuthOptions(): Promise<NextAuthOptions> {
  // Get credentials from database or environment variables
  const googleCredentials = await getGoogleCredentials();
  const outlookCredentials = await getOutlookCredentials();

  return {
    // Required for security - must be set via environment variable
    secret: process.env.NEXTAUTH_SECRET,

    providers: [
      // Keep existing providers for calendar connections
      GoogleProvider({
        clientId: googleCredentials.clientId,
        clientSecret: googleCredentials.clientSecret,
        authorization: {
          params: {
            scope:
              "openid email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
        },
      }),
      AzureADProvider({
        clientId: outlookCredentials.clientId,
        clientSecret: outlookCredentials.clientSecret,
        tenantId: outlookCredentials.tenantId,
        authorization: {
          params: {
            scope: MICROSOFT_GRAPH_SCOPES.join(" "),
          },
        },
      }),
      // Add credentials provider for email/password authentication
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            logger.warn("Missing credentials", {}, LOG_SOURCE);
            return null;
          }

          try {
            const user = await authenticateUser(
              credentials.email,
              credentials.password
            );
            return user;
          } catch (error) {
            logger.error(
              "Error in credentials authorization",
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
            return null;
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account, profile, user }) {
        // Initial sign in with OAuth
        if (account && profile) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.provider = account.provider;
        }

        // Include user role in the token if available (credentials login)
        if (user) {
          token.role = (user as UserWithRole).role;
        }

        // If we don't have a role yet, fetch it from the database
        // This handles OAuth logins where the user object doesn't include role
        if (!token.role && token.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { role: true },
            });
            if (dbUser?.role) {
              token.role = dbUser.role;
            }
          } catch (error) {
            logger.error(
              "Failed to fetch user role from database",
              { error: error instanceof Error ? error.message : "Unknown error" },
              LOG_SOURCE
            );
          }
        }

        return token;
      },
      async session({ session, token }) {
        // Explicitly include user with role in the returned session
        // This ensures the role is exposed to the client
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub,
            role: token.role,
          },
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          provider: token.provider,
        };
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    debug: process.env.NODE_ENV === "development",
    session: {
      strategy: "jwt",
      // Set a very long maxAge to keep users logged in indefinitely
      // They will only be logged out if they click the logout button
      maxAge: 365 * 24 * 60 * 60, // 1 year
    },
  };
}
