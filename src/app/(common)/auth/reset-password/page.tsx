import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

export const metadata = {
  title: "Reset Password - FluidCalendar",
  description: "Reset your FluidCalendar account password",
};

export default function ResetPasswordPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <PasswordResetForm />
    </div>
  );
}
