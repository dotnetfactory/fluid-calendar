import axios, { AxiosError, AxiosInstance } from "axios";
import { toast } from "sonner";

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

    // Don't show toast for 401 errors as they're handled by auth
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(
      new ApiError(message, error.response?.status, error.response?.data)
    );
  }
);
