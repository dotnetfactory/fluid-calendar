import { useState, useEffect } from "react";
import { SettingsSection, SettingRow } from "./SettingsSection";
import { useSettingsStore } from "@/store/settings";
import { OutlookTaskImportModal } from "../tasks/OutlookTaskImportModal";
import { format } from "@/lib/date-utils";

interface OutlookTaskList {
  id: string;
  name: string;
  isDefaultFolder: boolean;
  projectMapping?: {
    projectId: string;
    projectName: string;
    lastImported: string;
  };
}

export function OutlookTaskSettings() {
  const { accounts } = useSettingsStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [taskLists, setTaskLists] = useState<OutlookTaskList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outlookAccounts = accounts.filter((acc) => acc.provider === "OUTLOOK");

  // Load task lists for the selected account
  useEffect(() => {
    if (selectedAccount) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/tasks/outlook/lists?accountId=${selectedAccount}`)
        .then((res) => res.json())
        .then((data) => {
          setTaskLists(data);
        })
        .catch((err) => {
          console.error("Failed to fetch task lists:", err);
          setError("Failed to load task lists. Please try again.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedAccount]);

  const handleRemoveMapping = async (listId: string) => {
    if (!window.confirm("Are you sure you want to remove this mapping?")) {
      return;
    }

    try {
      const response = await fetch("/api/tasks/outlook/mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove mapping");
      }

      // Refresh task lists
      if (selectedAccount) {
        const res = await fetch(
          `/api/tasks/outlook/lists?accountId=${selectedAccount}`
        );
        const data = await res.json();
        setTaskLists(data);
      }
    } catch (err) {
      console.error("Failed to remove mapping:", err);
      setError("Failed to remove mapping. Please try again.");
    }
  };

  return (
    <SettingsSection
      title="Outlook Tasks"
      description="Manage your Outlook task list integration and mappings."
    >
      {outlookAccounts.length === 0 ? (
        <SettingRow
          label="No Outlook Accounts"
          description="Connect an Outlook account to import tasks"
        >
          <div className="text-sm text-gray-500">
            Go to the Accounts tab to connect your Outlook account.
          </div>
        </SettingRow>
      ) : (
        <>
          <SettingRow
            label="Select Account"
            description="Choose which Outlook account to manage"
          >
            <select
              value={selectedAccount || ""}
              onChange={(e) => setSelectedAccount(e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select an account</option>
              {outlookAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </SettingRow>

          {selectedAccount && (
            <>
              <SettingRow
                label="Task Lists"
                description="Manage your Outlook task list mappings"
              >
                <div className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  {isLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : taskLists.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No task lists found in this account.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {taskLists.map((list) => (
                        <div
                          key={list.id}
                          className="flex items-start justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {list.name}
                              {list.isDefaultFolder && (
                                <span className="ml-2 text-xs text-gray-500">
                                  (Default)
                                </span>
                              )}
                            </div>
                            {list.projectMapping ? (
                              <div className="mt-1 text-sm">
                                <span className="text-gray-500">
                                  Mapped to project:
                                </span>{" "}
                                <span className="text-gray-900">
                                  {list.projectMapping.projectName}
                                </span>
                                <div className="text-xs text-gray-500">
                                  Last imported:{" "}
                                  {format(
                                    new Date(list.projectMapping.lastImported),
                                    "PPp"
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 text-sm text-gray-500">
                                Not mapped to any project
                              </div>
                            )}
                          </div>
                          {list.projectMapping && (
                            <button
                              onClick={() => handleRemoveMapping(list.id)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              Remove Mapping
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowImportModal(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Import Tasks
                  </button>
                </div>
              </SettingRow>
            </>
          )}
        </>
      )}

      {selectedAccount && (
        <OutlookTaskImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          accountId={selectedAccount}
        />
      )}
    </SettingsSection>
  );
}
