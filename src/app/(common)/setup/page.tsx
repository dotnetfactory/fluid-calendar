import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup/SetupForm";

import { checkSetupStatus } from "@/lib/setup-actions";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";
// Disable all caching for this page
export const revalidate = 0;

export const metadata = {
  title: "Setup FluidCalendar",
  description: "Set up your FluidCalendar admin account",
};

export default async function SetupPage() {
  // First, check if setup is already completed in SystemSettings
  const { needsSetup } = await checkSetupStatus();

  if (!needsSetup) {
    // Setup is complete in SystemSettings, redirect to calendar
    redirect("/calendar?refresh=" + Date.now());
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">FluidCalendar Setup</h1>
        <p className="text-gray-600">
          Create your admin account to get started with the multi-user version
        </p>
      </div>

      <SetupForm />
    </div>
  );
}
