import dynamic from "next/dynamic";

/**
 * Waitlist settings page shell.
 * OS mode: shows "SaaS Feature Only" message (from src/features/routes/waitlist-settings.tsx)
 * SaaS mode: shows full WaitlistDashboard (from saas/src/routes/waitlist-settings.tsx)
 *
 * The @saas alias resolves to the correct implementation automatically.
 */
const WaitlistPage = dynamic(() => import("@saas/routes/waitlist-settings"), {
  loading: () => <p>Loading...</p>,
});

export default function Page() {
  return <WaitlistPage />;
}
