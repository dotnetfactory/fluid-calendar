import { SetupForm } from "@/components/setup/SetupForm";
import { redirect } from "next/navigation";
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
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">FluidCalendar Setup</h1>
        <p className="text-gray-600">
          Create your admin account to get started with the multi-user version
        </p>
      </div>

      <SetupForm />
    </div>
  );
}
