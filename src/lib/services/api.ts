import axios, { AxiosError, AxiosInstance } from "axios";
import { getSession, signOut } from "next-auth/react";
import { toast } from "sonner";

import { clearStoresOnLogout } from "@/lib/auth/store-management";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Force sign-out on 401 responses. Only signs out if the user has an
 * active session (a 401 on a public page with no session is expected).
 * Debounced so concurrent 401s only trigger a single sign-out.
 */
let signingOut = false;
export async function forceSignOut() {
  if (signingOut) return;

  const session = await getSession();
  if (!session) return;

  signingOut = true;
  clearStoresOnLogout();
  signOut({ callbackUrl: "/auth/signin" });
}

export const api: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An error occurred";

    if (error.response?.status === 401) {
      forceSignOut();
    } else {
      toast.error(message);
    }

    return Promise.reject(
      new ApiError(message, error.response?.status, error.response?.data)
    );
  }
);
