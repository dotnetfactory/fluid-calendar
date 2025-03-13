import React from "react";

interface AccessDeniedMessageProps {
  /**
   * Custom message to display
   * @default "You do not have permission to access this resource."
   */
  message?: string;

  /**
   * Custom title to display
   * @default "Access Denied"
   */
  title?: string;
}

/**
 * A reusable component to display an access denied message
 * Used when a user tries to access a resource they don't have permission for
 */
export default function AccessDeniedMessage({
  message = "You do not have permission to access this resource.",
  title = "Access Denied",
}: AccessDeniedMessageProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-red-500">{title}</h2>
      <p className="mt-2">{message}</p>
    </div>
  );
}
