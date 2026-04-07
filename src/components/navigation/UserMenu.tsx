"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DollarSign, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSubscription } from "@saas/hooks/useSubscription";
import { useLogout } from "@/lib/auth/store-management";
import { isSaasEnabled } from "@/lib/config";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { data: session, status: sessionStatus } = useSession();
  const { logoutWithCleanup, isLoggingOut } = useLogout();
  const pathname = usePathname();
  const { hasActiveSubscription, plan, status: subscriptionStatus, loading: subscriptionLoading } = useSubscription();

  // Check if we're on pricing page and user doesn't have subscription
  const isPricingPageWithoutSubscription = pathname === "/pricing" && !hasActiveSubscription && !subscriptionLoading;

  // Show a loading state or nothing while session is loading
  if (sessionStatus === "loading") {
    return null; // Return nothing during loading to prevent flash of sign-in button
  }

  // Check both session status and session data to handle all authentication scenarios
  if (sessionStatus !== "authenticated" || !session) {
    return (
      <Link href="/auth/signin">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </Link>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!session.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Extract plan name for display
  const getPlanDisplayName = () => {
    if (!plan) return null;

    // If user is trialing, always show "Trial" regardless of the plan
    if (subscriptionStatus === "TRIALING") {
      return "Trial";
    }

    // Convert plan enum to display name
    switch (plan) {
      case "FREE":
        return "Free";
      case "BASIC_MONTHLY":
      case "BASIC_YEARLY":
        return "Basic";
      case "PRO_MONTHLY":
      case "PRO_YEARLY":
        return "Pro";
      case "ADVANCED_MONTHLY":
      case "ADVANCED_YEARLY":
        return "Advanced";
      case "LIFETIME":
        return "Lifetime";
      case "TRIALING":
        return "Trial";
      default:
        return null;
    }
  };

  const planDisplayName = getPlanDisplayName();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session.user?.image || ""}
              alt={session.user?.name || "User"}
            />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {session.user?.name}
              </p>
              {planDisplayName && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 dark:bg-gray-700 dark:text-gray-200">
                  {planDisplayName}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Settings - disable on pricing page without subscription */}
        {isPricingPageWithoutSubscription ? (
          <DropdownMenuItem
            disabled
            className={cn("cursor-not-allowed opacity-50")}
            title="Subscription required"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Pricing - only shown in SaaS mode */}
        {isSaasEnabled && (
          <DropdownMenuItem asChild>
            <Link href="/pricing" className="cursor-pointer">
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Pricing</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => logoutWithCleanup()}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
