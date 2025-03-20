import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";
import { MICROSOFT_GRAPH_SCOPES } from "@/lib/outlook";
import { authenticateUser } from "@/lib/auth/credentials-provider";
import { logger } from "@/lib/logger";

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
    // Add secret for production - required for security
    secret:
      process.env.NEXTAUTH_SECRET ||
      // Fallback secret - only used if NEXTAUTH_SECRET is not set
      // In production, this should always be set via environment variable
      "EM2RYkch0Uj+Qt2Cu0eDCmo/kv0MenNnHUaciNAjSrM=",

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
        // Initial sign in
        if (account && profile) {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            provider: account.provider,
          };
        }

        // Include user role in the token if available
        if (user) {
          // Add role from user object to token
          // TypeScript doesn't know about our custom role property
          token.role = (user as UserWithRole).role;
        }

        return token;
      },
      async session({ session, token }) {
        // Add user role to the session
        if (session.user) {
          session.user.role = token.role;
        }

        return {
          ...session,
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
