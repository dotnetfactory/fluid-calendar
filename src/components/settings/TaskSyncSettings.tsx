import { useCallback, useEffect, useState } from "react";

import {
  Calendar,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { format } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import { useProjectStore } from "@/store/project";
import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

// Logging source
const LOG_SOURCE = "TaskSyncSettings";

// Types for providers and mappings
interface TaskProvider {
  id: string;
  type: "OUTLOOK" | "CALDAV";
  name: string;
  accountId?: string;
  accountEmail?: string; // This will be populated from the account for UI display
  enabled: boolean;
  syncEnabled: boolean;
  syncInterval: string;
  lastSyncedAt?: string | Date;
  defaultProjectId?: string;
  error?: string;
  settings?: {
    [key: string]: string | number | boolean | undefined;
  };
}

interface TaskList {
  id: string;
  name: string;
  isDefaultFolder?: boolean;
  isMapped: boolean;
  mappingId?: string;
  projectId?: string;
  projectName?: string;
  lastSyncedAt?: string;
  mappingDirection?: "incoming" | "outgoing" | "bidirectional";
}

export function TaskSyncSettings() {
  const { accounts } = useSettingsStore();
  const { projects } = useProjectStore();

  // State
  const [providers, setProviders] = useState<TaskProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<TaskProvider | null>(
    null
  );
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("task-lists");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

  // Get accounts that can be used as task providers
  const compatibleAccounts = accounts.filter(
    (acc) => acc.provider === "OUTLOOK" || acc.provider === "GOOGLE"
  );
  // Fetch providers
  const fetchProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    setError(null);

    try {
      const response = await fetch("/api/task-sync/providers");
      if (!response.ok) {
        throw new Error("Failed to fetch task providers");
      }

      // API now returns full provider objects directly
      const providers = await response.json();

      // Enrich providers with account emails
      const enrichedProviders = await Promise.all(
        providers.map(async (provider: TaskProvider) => {
          if (provider.accountId) {
            // Find account in local state first
            const account = accounts.find((a) => a.id === provider.accountId);
            if (account) {
              return { ...provider, accountEmail: account.email };
            }

            // If not found in local state, try to fetch from API
            try {
              const accountResponse = await fetch(
                `/api/accounts/${provider.accountId}`
              );
              if (accountResponse.ok) {
                const accountData = await accountResponse.json();
                return { ...provider, accountEmail: accountData.email };
              }
            } catch (e) {
              // Ignore errors from account fetch, we'll just show "Unknown" email
              console.error("Failed to fetch account for provider", e);
            }
          }

          // If we couldn't get an email, show unknown
          return { ...provider, accountEmail: "Unknown Account" };
        })
      );

      setProviders(enrichedProviders);

      // Auto-select the first provider if available
      if (enrichedProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(enrichedProviders[0]);
      }
    } catch (error) {
      setError("Failed to load task providers");
      logger.error(
        "Failed to fetch task providers",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    } finally {
      setIsLoadingProviders(false);
    }
  }, [accounts, selectedProvider]);
  // Load providers and projects when component mounts
  useEffect(() => {
    fetchProviders();
    const { fetchProjects } = useProjectStore.getState();
    fetchProjects();
  }, [fetchProviders]);

  // Fetch mappings for a provider
  const fetchMappings = useCallback(async (providerId: string) => {
    try {
      const response = await fetch(
        `/api/task-sync/mappings?providerId=${providerId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch task list mappings");
      }

      // We just fetch but don't need to store the mappings since they're not used
      await response.json();
    } catch (error) {
      logger.error(
        "Failed to fetch task list mappings",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          providerId,
        },
        LOG_SOURCE
      );
    }
  }, []);

  // Fetch task lists for a provider
  const fetchTaskLists = useCallback(async (providerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/task-sync/providers/${providerId}/lists`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch task lists");
      }

      const data = await response.json();
      setTaskLists(data);
    } catch (error) {
      setError("Failed to load task lists");
      logger.error(
        "Failed to fetch task lists",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          providerId,
        },
        LOG_SOURCE
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load task lists for the selected provider
  useEffect(() => {
    if (selectedProvider) {
      fetchTaskLists(selectedProvider.id);
      fetchMappings(selectedProvider.id);
    }
  }, [selectedProvider, fetchTaskLists, fetchMappings]);

  // Create a new provider
  const createProvider = async () => {
    if (!newProviderName || !selectedAccount) {
      // Show error toast for missing fields
      toast.error("Please enter a name and select an account");
      return;
    }

    setIsCreating(true);

    try {
      // Find account email for UI display
      const account = accounts.find((acc) => acc.id === selectedAccount);
      const accountEmail = account?.email || "Unknown Account";

      const response = await fetch("/api/task-sync/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProviderName,
          type: "OUTLOOK",
          settings: {},
          accountId: selectedAccount,
        }),
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => null);
        console.error("Failed to create provider:", responseData);
        throw new Error("Failed to create task provider");
      }

      // Get the new provider data from response
      const newProvider = await response.json();

      // Add the account email to the provider object for display
      const enrichedProvider = {
        ...newProvider,
        accountEmail,
      };

      // Add the new provider to the list and select it
      setProviders([...providers, enrichedProvider]);
      setSelectedProvider(enrichedProvider);
      setNewProviderName("");
      setSelectedAccount("");

      // Show success toast
      toast.success("Task provider created successfully");

      // Close the dialog
      setIsDialogOpen(false);
    } catch (error) {
      setError("Failed to create task provider");
      logger.error(
        "Failed to create task provider",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("Failed to create task provider");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a provider
  const deleteProvider = async (providerId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this provider? All task list mappings associated with this provider will also be deleted."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/task-sync/providers/${providerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task provider");
      }

      toast.success("Task provider deleted successfully");

      // Refresh providers
      await fetchProviders();
      setSelectedProvider(null);
    } catch (error) {
      toast.error("Failed to delete task provider");
      logger.error(
        "Failed to delete task provider",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          providerId,
        },
        LOG_SOURCE
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Create a mapping for a task list
  const createMapping = async (
    externalListId: string,
    projectId: string,
    createNewProject: boolean = false
  ) => {
    if (!selectedProvider) return;

    try {
      setIsLoading(true);
      const list = taskLists.find((l) => l.id === externalListId);

      // If creating a new project
      if (createNewProject && list) {
        const projectResponse = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: list.name,
            description: `Project created for syncing with ${selectedProvider.name} task list`,
          }),
        });

        if (!projectResponse.ok) {
          throw new Error("Failed to create new project");
        }

        const newProject = await projectResponse.json();
        projectId = newProject.id;

        // Update projects in store
        const { fetchProjects } = useProjectStore.getState();
        await fetchProjects();
      }

      const response = await fetch("/api/task-sync/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          externalListId,
          externalListName: list?.name || "Unknown List",
          projectId,
          direction: "bidirectional", // Always set to bidirectional
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task list mapping");
      }

      toast.success("Task list mapped successfully");

      // Refresh lists and mappings
      await fetchTaskLists(selectedProvider.id);
      await fetchMappings(selectedProvider.id);
    } catch (error) {
      toast.error("Failed to create task list mapping");
      logger.error(
        "Failed to create task list mapping",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a mapping
  const deleteMapping = async (mappingId: string) => {
    if (!window.confirm("Are you sure you want to remove this mapping?")) {
      return;
    }

    if (!selectedProvider) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/task-sync/mappings/${mappingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task list mapping");
      }

      toast.success("Task list mapping removed successfully");

      // Refresh lists and mappings
      await fetchTaskLists(selectedProvider.id);
      await fetchMappings(selectedProvider.id);
    } catch (error) {
      toast.error("Failed to remove task list mapping");
      logger.error(
        "Failed to remove task list mapping",
        {
          error: error instanceof Error ? error.message : "Unknown error",
          mappingId,
        },
        LOG_SOURCE
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger sync for the selected provider
  const triggerSync = async (providerId: string) => {
    setIsLoading(true);

    try {
      const provider = providers.find((p) => p.id === providerId);
      const direction = provider?.settings?.direction || "bidirectional";

      const response = await fetch(`/api/task-sync/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId,
          direction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to trigger provider sync:", errorData);
        toast.error("Failed to trigger sync");
        return;
      }

      const data = await response.json();
      toast.success("Sync job scheduled");
      console.log("Sync job:", data);
    } catch (error) {
      console.error("Error triggering sync:", error);
      toast.error("Failed to trigger sync");
    } finally {
      setIsLoading(false);
    }
  };

  // Find unused accounts (accounts that are not already task providers)
  const unusedAccounts = compatibleAccounts.filter(
    (account) =>
      !providers.some(
        (provider) =>
          provider.accountEmail === account.email &&
          provider.type === account.provider
      )
  );

  // Trigger sync for a specific mapping
  const triggerMappingSync = async (mappingId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/task-sync/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mappingId,
          direction: "bidirectional", // Default to bidirectional sync
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to trigger mapping sync:", errorData);
        toast.error("Failed to trigger sync");
        return;
      }

      const data = await response.json();
      toast.success("Sync job scheduled");
      console.log("Sync job:", data);
    } catch (error) {
      console.error("Error triggering sync:", error);
      toast.error("Failed to trigger sync");
    } finally {
      setIsLoading(false);
    }
  };

  // Render the provider selection and creation UI
  const renderProviderSelection = () => {
    return (
      <SettingRow
        label="Task Provider"
        description="Select or create a task provider"
      >
        <div className="space-y-4">
          {isLoadingProviders ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading providers...
              </span>
            </div>
          ) : (
            <>
              {providers.length > 0 ? (
                <Select
                  value={selectedProvider?.id || ""}
                  onValueChange={(value) => {
                    const provider = providers.find((p) => p.id === value);
                    setSelectedProvider(provider || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name} ({provider.accountEmail})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert>
                  <AlertTitle>No Task Providers</AlertTitle>
                  <AlertDescription>
                    You need to create a task provider to sync tasks from
                    external services.
                  </AlertDescription>
                </Alert>
              )}

              {unusedAccounts.length > 0 && (
                <div className="pt-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Provider
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Task Provider</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Provider Name</Label>
                          <Input
                            id="name"
                            value={newProviderName}
                            onChange={(e) => setNewProviderName(e.target.value)}
                            placeholder="e.g., Work Outlook Tasks"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="account">Account</Label>
                          <Select
                            value={selectedAccount}
                            onValueChange={setSelectedAccount}
                          >
                            <SelectTrigger id="account">
                              <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent>
                              {unusedAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.email} ({account.provider})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createProvider}
                          disabled={
                            isCreating || !newProviderName || !selectedAccount
                          }
                        >
                          {isCreating && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Add Provider
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </>
          )}
        </div>
      </SettingRow>
    );
  };

  // Render provider details and actions
  const renderProviderDetails = () => {
    if (!selectedProvider) return null;

    return (
      <SettingRow
        label="Provider Details"
        description="View and manage provider settings"
      >
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Provider Type
                </div>
                <div className="font-medium capitalize">
                  {selectedProvider.type}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Account</div>
                <div className="font-medium">
                  {selectedProvider.accountEmail}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Synced</div>
                <div className="font-medium">
                  {selectedProvider.lastSyncedAt
                    ? format(
                        typeof selectedProvider.lastSyncedAt === "string"
                          ? new Date(selectedProvider.lastSyncedAt)
                          : selectedProvider.lastSyncedAt,
                        "PPp"
                      )
                    : "Never"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Sync Interval
                </div>
                <div className="font-medium">
                  {selectedProvider.syncInterval === "0"
                    ? "Manual only"
                    : `${selectedProvider.syncInterval} minutes`}
                </div>
              </div>
            </div>

            {selectedProvider.error && (
              <Alert variant="destructive">
                <AlertTitle>Sync Error</AlertTitle>
                <AlertDescription>{selectedProvider.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteProvider(selectedProvider.id)}
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Provider
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync(selectedProvider.id)}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          </CardFooter>
        </Card>
      </SettingRow>
    );
  };

  // Render task lists and mappings
  const renderTaskLists = () => {
    if (!selectedProvider) return null;

    // Project options are created directly from the projects prop
    const projectOptions = projects.map((p) => ({
      value: p.id,
      label: p.name,
    }));

    return (
      <SettingRow
        label="Task Lists"
        description="Map external task lists to FluidCalendar projects"
      >
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading task lists...
              </span>
            </div>
          ) : taskLists.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No task lists found for this provider.
            </div>
          ) : (
            <div className="space-y-3">
              {taskLists.map((list) => (
                <Card key={list.id}>
                  <CardContent className="flex items-start justify-between pt-6">
                    <div>
                      <div className="text-sm font-medium">
                        {list.name}
                        {list.isDefaultFolder && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Default)
                          </span>
                        )}
                      </div>
                      {list.isMapped ? (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">
                            Mapped to project:
                          </span>{" "}
                          <span>{list.projectName}</span>
                          {list.lastSyncedAt && (
                            <div className="text-xs text-muted-foreground">
                              Last synced:{" "}
                              {format(new Date(list.lastSyncedAt), "PPp")}
                            </div>
                          )}
                          <div className="mt-2 flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                list.mappingId &&
                                triggerMappingSync(list.mappingId)
                              }
                              disabled={isLoading || !list.mappingId}
                            >
                              <RefreshCw className="mr-1 h-4 w-4" />
                              Sync
                            </Button>
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                list.mappingId && deleteMapping(list.mappingId)
                              }
                              disabled={isLoading}
                            >
                              Remove Mapping
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <div className="mb-2 text-sm text-muted-foreground">
                            Not mapped to any project
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Select
                              disabled={
                                isLoading || projectOptions.length === 0
                              }
                              onValueChange={(projectId) =>
                                createMapping(list.id, projectId)
                              }
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Map to existing project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projectOptions.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No projects available
                                  </SelectItem>
                                ) : (
                                  projectOptions.map((project) => (
                                    <SelectItem
                                      key={project.value}
                                      value={project.value}
                                    >
                                      {project.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => createMapping(list.id, "", true)}
                              disabled={isLoading}
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              Create New Project
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Badge variant={list.isMapped ? "default" : "outline"}>
                      {list.isMapped ? "Mapped" : "Not Mapped"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SettingRow>
    );
  };

  // Render sync history
  const renderSyncHistory = () => {
    if (!selectedProvider) return null;

    return (
      <SettingRow
        label="Sync History"
        description="View recent sync activities and results"
      >
        <div className="p-4 text-center text-muted-foreground">
          <p>Sync history will be available in a future update.</p>
        </div>
      </SettingRow>
    );
  };

  return (
    <SettingsSection
      title="Task Synchronization"
      description="Manage task synchronization with external services such as Outlook or Google Tasks."
    >
      {compatibleAccounts.length === 0 ? (
        <SettingRow
          label="No Compatible Accounts"
          description="Connect an Outlook account to sync tasks"
        >
          <div className="text-sm text-muted-foreground">
            Go to the Accounts tab to connect a compatible account.
          </div>
        </SettingRow>
      ) : (
        <>
          {renderProviderSelection()}

          {selectedProvider && (
            <>
              {renderProviderDetails()}

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="task-lists" className="flex-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    Task Lists
                  </TabsTrigger>
                  <TabsTrigger value="sync-history" className="flex-1">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Sync History
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="task-lists" className="mt-0">
                  {renderTaskLists()}
                </TabsContent>
                <TabsContent value="sync-history" className="mt-0">
                  {renderSyncHistory()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </SettingsSection>
  );
}
