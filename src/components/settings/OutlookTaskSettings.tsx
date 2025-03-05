import { useState, useEffect } from "react";
import { SettingsSection, SettingRow } from "./SettingsSection";
import { useSettingsStore } from "@/store/settings";
import { useProjectStore } from "@/store/project";
import { OutlookTaskImportModal } from "../tasks/OutlookTaskImportModal";
import { format, newDate } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

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
  const { fetchProjects } = useProjectStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [taskLists, setTaskLists] = useState<OutlookTaskList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outlookAccounts = accounts.filter((acc) => acc.provider === "OUTLOOK");

  // Load projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
          <div className="text-sm text-muted-foreground">
            Go to the Accounts tab to connect your Outlook account.
          </div>
        </SettingRow>
      ) : (
        <>
          <SettingRow
            label="Select Account"
            description="Choose which Outlook account to manage"
          >
            <Select
              value={selectedAccount || "none"}
              onValueChange={(value) =>
                setSelectedAccount(value === "none" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select an account</SelectItem>
                {outlookAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          {selectedAccount && (
            <>
              <SettingRow
                label="Task Lists"
                description="Manage your Outlook task list mappings"
              >
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : taskLists.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No task lists found in this account.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {taskLists.map((list) => (
                        <Card key={list.id}>
                          <CardContent className="pt-6 flex items-start justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {list.name}
                                {list.isDefaultFolder && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Default)
                                  </span>
                                )}
                              </div>
                              {list.projectMapping ? (
                                <div className="mt-1 text-sm">
                                  <span className="text-muted-foreground">
                                    Mapped to project:
                                  </span>{" "}
                                  <span>{list.projectMapping.projectName}</span>
                                  <div className="text-xs text-muted-foreground">
                                    Last imported:{" "}
                                    {format(
                                      newDate(list.projectMapping.lastImported),
                                      "PPp"
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  Not mapped to any project
                                </div>
                              )}
                            </div>
                            {list.projectMapping && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveMapping(list.id)}
                              >
                                Remove Mapping
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <Button onClick={() => setShowImportModal(true)}>
                    Import Tasks
                  </Button>
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
