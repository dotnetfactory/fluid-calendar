import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getGoogleCredentials, getOutlookCredentials } from "@/lib/auth";
import { MICROSOFT_GRAPH_SCOPES } from "@/lib/outlook";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

const googleCredentials = await getGoogleCredentials();
const outlookCredentials = await getOutlookCredentials();

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: googleCredentials.clientId,
      clientSecret: googleCredentials.clientSecret,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
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
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          provider: account.provider,
        };
      }
      return token;
    },
    async session({ session, token }) {
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
    signIn: "/",
    error: "/",
  },
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
});

export { handler as GET, handler as POST };
