"use client";

/**
 * Open source version of the Waitlist Admin page
 * This shows a message that the feature is only available in the SAAS version
 */
export default function WaitlistPage() {
  return (
    <div className="rounded-lg bg-muted p-6">
      <h2 className="mb-4 text-2xl font-bold">Beta Waitlist Management</h2>
      <div className="mb-6 border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>SAAS Feature Only:</strong> The Beta Waitlist Management
              feature is only available in the SAAS version of FluidCalendar.
            </p>
          </div>
        </div>
      </div>
      <p className="mb-4 text-gray-700">
        The Beta Waitlist Management feature allows you to:
      </p>
      <ul className="mb-6 list-disc space-y-2 pl-5 text-gray-700">
        <li>Manage a waitlist for your beta program</li>
        <li>Send invitations to users on the waitlist</li>
        <li>Track referrals and prioritize users</li>
        <li>Configure waitlist settings and email templates</li>
      </ul>
      <p className="text-gray-700">
        To access this feature, please upgrade to the SAAS version of Fluid
        Calendar.
      </p>
    </div>
  );
}
