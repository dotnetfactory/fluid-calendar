import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "CalDAVAccountForm";

// Define types for test results
interface TestStep {
  step: string;
  status: "pending" | "success" | "failed";
  error?: string;
  calendars?: number;
  calendarNames?: string[];
}

interface TestResult {
  steps: TestStep[];
  success: boolean;
  error: string | null;
  details: string | null;
}

interface CalDAVAccountFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form component for adding a new CalDAV account
 * Collects server URL, username, password, and optional path
 */
export function CalDAVAccountForm({
  onSuccess,
  onCancel,
}: CalDAVAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [formData, setFormData] = useState({
    serverUrl: "",
    username: "",
    password: "",
    path: "", // Optional path for some CalDAV servers
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user makes changes
    if (errorMessage) {
      setErrorMessage(null);
    }

    // Clear test results when form changes
    if (testResults) {
      setTestResults(null);
    }
  };

  const handleTest = async () => {
    // Validate form
    if (!formData.serverUrl || !formData.username || !formData.password) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    try {
      setIsTesting(true);
      setErrorMessage(null);
      setTestResults(null);

      // Ensure the server URL has the correct format
      let serverUrl = formData.serverUrl;
      if (
        !serverUrl.startsWith("http://") &&
        !serverUrl.startsWith("https://")
      ) {
        serverUrl = `https://${serverUrl}`;
      }

      // Remove trailing slash if present
      if (serverUrl.endsWith("/")) {
        serverUrl = serverUrl.slice(0, -1);
      }

      const response = await fetch("/api/calendar/caldav/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl,
          username: formData.username,
          password: formData.password,
          path: formData.path || undefined,
        }),
      });

      const data = await response.json();
      setTestResults(data as TestResult);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to connect to CalDAV server");
      }

      logger.info(
        "CalDAV test connection successful",
        { serverUrl, username: formData.username },
        LOG_SOURCE
      );
    } catch (error) {
      logger.error(
        "CalDAV test connection failed",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to connect to CalDAV server"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate form
    if (!formData.serverUrl || !formData.username || !formData.password) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Ensure the server URL has the correct format
      let serverUrl = formData.serverUrl;
      if (
        !serverUrl.startsWith("http://") &&
        !serverUrl.startsWith("https://")
      ) {
        serverUrl = `https://${serverUrl}`;
      }

      // Remove trailing slash if present
      if (serverUrl.endsWith("/")) {
        serverUrl = serverUrl.slice(0, -1);
      }

      const response = await fetch("/api/calendar/caldav/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl,
          username: formData.username,
          password: formData.password,
          path: formData.path || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to connect to CalDAV server"
        );
      }

      await response.json();

      alert(`Successfully connected to CalDAV server for ${formData.username}`);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error(
        "Failed to connect CalDAV account",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to connect to CalDAV server"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render test results
  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <div className="mt-4 p-4 border rounded-md bg-gray-50">
        <h3 className="font-medium mb-2">Connection Test Results</h3>

        {testResults.steps &&
          testResults.steps.map((step, index) => (
            <div key={index} className="mb-2">
              <div className="flex items-center">
                <span
                  className={`mr-2 ${
                    step.status === "success"
                      ? "text-green-500"
                      : step.status === "failed"
                      ? "text-red-500"
                      : "text-yellow-500"
                  }`}
                >
                  {step.status === "success"
                    ? "✓"
                    : step.status === "failed"
                    ? "✗"
                    : "⟳"}
                </span>
                <span className="font-medium">{step.step}</span>
                {step.status === "success" && step.calendars !== undefined && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({step.calendars} calendars found)
                  </span>
                )}
              </div>

              {step.error && (
                <div className="ml-6 mt-1 text-sm text-red-600 whitespace-pre-wrap">
                  Error: {step.error}
                </div>
              )}

              {step.calendarNames && step.calendarNames.length > 0 && (
                <div className="ml-6 mt-1 text-sm text-gray-600">
                  Calendars: {step.calendarNames.join(", ")}
                </div>
              )}
            </div>
          ))}

        {testResults.error && !testResults.steps?.some((s) => s.error) && (
          <div className="text-red-600 mt-2">
            <div className="font-medium">Error:</div>
            <div className="text-sm whitespace-pre-wrap">
              {testResults.error}
            </div>
          </div>
        )}

        {testResults.success && (
          <div className="text-green-600 mt-2 font-medium">
            Connection successful! You can now connect your account.
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect CalDAV Account</CardTitle>
        <CardDescription>
          Add your CalDAV calendar account from services like Fastmail, iCloud,
          or other CalDAV providers
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 mb-3 text-sm border border-red-300 bg-red-50 text-red-800 rounded-md">
              {errorMessage}
            </div>
          )}

          <fieldset className="mb-4">
            <label
              className="block text-[15px] leading-normal mb-2.5"
              htmlFor="serverUrl"
            >
              Server URL <span className="text-red-500">*</span>
            </label>
            <input
              className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
              id="serverUrl"
              name="serverUrl"
              placeholder="https://caldav.example.com"
              value={formData.serverUrl}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              For Fastmail: https://caldav.fastmail.com
            </p>
          </fieldset>

          <fieldset className="mb-4">
            <label
              className="block text-[15px] leading-normal mb-2.5"
              htmlFor="username"
            >
              Username <span className="text-red-500">*</span>
            </label>
            <input
              className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
              id="username"
              name="username"
              placeholder="your.email@example.com"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              For Fastmail: Use your full email address
            </p>
          </fieldset>

          <fieldset className="mb-4">
            <label
              className="block text-[15px] leading-normal mb-2.5"
              htmlFor="password"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <input
              className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              For Fastmail: Use an app-specific password from Settings →
              Password & Security
            </p>
          </fieldset>

          <fieldset className="mb-4">
            <label
              className="block text-[15px] leading-normal mb-2.5"
              htmlFor="path"
            >
              Path (Optional)
            </label>
            <input
              className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
              id="path"
              name="path"
              placeholder="/dav/calendars/user/username@fastmail.com"
              value={formData.path}
              onChange={handleChange}
            />
            <p className="text-sm text-muted-foreground mt-1">
              For Fastmail: /dav/calendars/user/youremail@fastmail.com
            </p>
          </fieldset>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || isSubmitting}
              className="w-full"
            >
              {isTesting ? "Testing Connection..." : "Test Connection"}
            </Button>
          </div>

          {renderTestResults()}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isTesting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isTesting}>
            {isSubmitting ? "Connecting..." : "Connect"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
