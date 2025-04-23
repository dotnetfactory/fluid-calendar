"use client";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "PasswordResetForm";

// Form validation schema
const requestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RequestFormValues = z.infer<typeof requestSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onRequestSubmit = async (data: RequestFormValues) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to request password reset");
      }

      toast.success("Password reset email sent", {
        description: "Please check your email for further instructions.",
      });

      // In development, show the reset link
      if (process.env.NODE_ENV === "development" && result.debug) {
        console.log("Debug - Reset URL:", result.debug.resetUrl);
      }
    } catch (error) {
      logger.error(
        "Error requesting password reset",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("Failed to request password reset", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormValues) => {
    if (!token) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password");
      }

      toast.success("Password reset successful", {
        description: "You can now sign in with your new password.",
      });

      // Redirect to sign in page
      router.push("/auth/signin");
    } catch (error) {
      logger.error(
        "Error resetting password",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("Failed to reset password", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          {token
            ? "Enter your new password below"
            : "Enter your email to reset your password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <form
            onSubmit={handleSubmitReset(onResetSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                {...registerReset("password")}
                className={resetErrors.password ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {resetErrors.password && (
                <p className="text-sm text-red-500">
                  {resetErrors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...registerReset("confirmPassword")}
                className={resetErrors.confirmPassword ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {resetErrors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {resetErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={handleSubmitRequest(onRequestSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...registerRequest("email")}
                className={requestErrors.email ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {requestErrors.email && (
                <p className="text-sm text-red-500">
                  {requestErrors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          variant="link"
          className="text-sm text-muted-foreground"
          onClick={() => router.push("/auth/signin")}
        >
          Back to Sign In
        </Button>
      </CardFooter>
    </Card>
  );
}
