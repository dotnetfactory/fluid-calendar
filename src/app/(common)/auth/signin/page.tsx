import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/SignInForm";

import { getAuthOptions } from "@/lib/auth/auth-options";
import { checkSetupStatus } from "@/lib/setup-actions";

export const metadata = {
  title: "Sign In | FluidCalendar",
  description: "Sign in to your FluidCalendar account",
};

// Force dynamic rendering to avoid caching issues with setup status
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Check if setup is completed
  const { needsSetup } = await checkSetupStatus();

  // If setup is not completed, redirect to setup page
  if (needsSetup) {
    redirect("/setup");
  }

  // Check if user is already signed in
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/calendar");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign in to FluidCalendar</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your calendar and tasks efficiently
          </p>
        </div>

        <SignInForm />
      </div>
    </div>
  );
}
