import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { LogSettings as LogSettingsType } from "@/lib/logger/types";

export function LogSettings() {
  const [settings, setSettings] = useState<LogSettingsType>({
    logLevel: "none",
    logDestination: "db",
    logRetention: {
      error: 30,
      warn: 14,
      info: 7,
      debug: 3,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  logger.info("LogSettings component mounted");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/logs/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
      logger.debug("Log settings fetched successfully", { metadata: data });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch settings";
      logger.error("Failed to fetch log settings", {
        error: errorMessage,
        metadata: { timestamp: new Date() },
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);

      const response = await fetch("/api/logs/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to update settings");

      logger.info("Log settings updated successfully", { metadata: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000); // Clear saved message after 3 seconds
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update settings";
      logger.error("Failed to update log settings", {
        error: errorMessage,
        metadata: { settings },
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Log Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure how logs are stored and managed in the system.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {saved && (
        <div className="p-4 bg-green-100 text-green-700 rounded">
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="logLevel"
            className="block text-sm font-medium text-gray-700"
          >
            Log Level
          </label>
          <select
            id="logLevel"
            value={settings.logLevel}
            onChange={(e) =>
              setSettings({
                ...settings,
                logLevel: e.target.value as LogSettingsType["logLevel"],
              })
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="none">None</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="logDestination"
            className="block text-sm font-medium text-gray-700"
          >
            Log Destination
          </label>
          <select
            id="logDestination"
            value={settings.logDestination}
            onChange={(e) =>
              setSettings({
                ...settings,
                logDestination: e.target
                  .value as LogSettingsType["logDestination"],
              })
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="db">Database Only</option>
            <option value="file">File Only</option>
            <option value="both">Both Database and File</option>
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">
          Retention Periods (Days)
        </h4>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(settings.logRetention).map(([level, days]) => (
            <div key={level}>
              <label
                htmlFor={`retention-${level}`}
                className="block text-sm font-medium text-gray-700 capitalize"
              >
                {level}
              </label>
              <input
                type="number"
                id={`retention-${level}`}
                value={days}
                min={1}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    logRetention: {
                      ...settings.logRetention,
                      [level]: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
