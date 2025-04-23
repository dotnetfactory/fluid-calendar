import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup/SetupForm";

import { checkSetupStatus } from "@/lib/setup-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Setup FluidCalendar",
  description: "Set up your FluidCalendar admin account",
};

export default async function SetupPage() {
  // Check if any users already exist
  const { needsSetup } = await checkSetupStatus();

  // If users already exist, redirect to home page
  if (!needsSetup) {
    redirect("/calendar");
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
