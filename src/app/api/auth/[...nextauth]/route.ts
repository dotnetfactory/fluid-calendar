import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";

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
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: string;
  }
}

// Create a NextAuth handler with the auth options
const handler = NextAuth(await getAuthOptions());

// Export the handler for both GET and POST requests
export { handler as GET, handler as POST };
