"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { isPublicSignupEnabledClient } from "@/lib/auth/client-public-signup";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SignInForm";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [publicSignupEnabled, setPublicSignupEnabled] = useState(false);

  useEffect(() => {
    const checkPublicSignup = async () => {
      try {
        const isEnabled = await isPublicSignupEnabledClient();
        setPublicSignupEnabled(isEnabled);
      } catch (error) {
        logger.error(
          "Failed to check if public signup is enabled",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      }
    };

    checkPublicSignup();
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Authentication failed", {
          description: "Please check your email and password and try again.",
        });
      } else {
        toast.success("Signed in successfully");

        // The token is set in the background, so we'll redirect after a minimal delay
        // to ensure the token is available for the next request
        setTimeout(() => {
          // Force a hard navigation to ensure the middleware re-evaluates with the new token
          window.location.href = "/calendar";
        }, 100);
      }
    } catch (error) {
      logger.error(
        "Error signing in",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Registration failed", {
          description: data.error || "Please try again later.",
        });
      } else {
        toast.success("Account created successfully", {
          description: "You can now sign in with your credentials.",
        });
        setActiveTab("signin");
      }
    } catch (error) {
      logger.error(
        "Error signing up",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("An error occurred", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Welcome to FluidCalendar
        </CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "signin" | "signup")}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            {publicSignupEnabled && (
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          {publicSignupEnabled && (
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name (Optional)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </CardFooter>
    </Card>
  );
}
