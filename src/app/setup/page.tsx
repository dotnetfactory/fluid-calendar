import { SetupForm } from "@/components/setup/SetupForm";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Setup FluidCalendar",
  description: "Set up your FluidCalendar admin account",
};

async function checkIfSetupNeeded() {
  try {
    // Use server-side fetch to check if setup is needed
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/setup/check`,
      {
        cache: "no-store", // Don't cache this request
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.needsSetup;
    }

    // If the check fails, we'll assume setup is needed
    return true;
  } catch (error) {
    console.error("Failed to check if setup is needed:", error);
    // If the check fails, we'll assume setup is needed
    return true;
  }
}

export default async function SetupPage() {
  // Check if any users already exist
  const needsSetup = await checkIfSetupNeeded();

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
