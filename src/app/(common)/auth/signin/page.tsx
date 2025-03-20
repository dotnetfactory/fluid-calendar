import { SignInForm } from "@/components/auth/SignInForm";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth/auth-options";

export const metadata = {
  title: "Sign In | FluidCalendar",
  description: "Sign in to your FluidCalendar account",
};

export default async function SignInPage() {
  // Check if user is already signed in
  const authOptions = await getAuthOptions();
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/calendar");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
