import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/store/project";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface OutlookTaskList {
  id: string;
  name: string;
  isDefaultFolder: boolean;
  projectMapping?: {
    projectId: string;
    projectName: string;
    lastImported: string;
    isAutoScheduled: boolean;
  };
}

interface OutlookTaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
}

interface FailedTask {
  name: string;
  listName: string;
  error: string;
  taskId: string;
}

export function OutlookTaskImportModal({
  isOpen,
  onClose,
  accountId,
}: OutlookTaskImportModalProps) {
  const { projects } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [taskLists, setTaskLists] = useState<OutlookTaskList[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [projectMappings, setProjectMappings] = useState<
    Record<string, { projectId: string; isAutoScheduled: boolean }>
  >({});
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [importInProgress, setImportInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    failedTasks?: FailedTask[];
  } | null>(null);
  const [showFailureDetails, setShowFailureDetails] = useState(false);

  // Fetch task lists when modal opens
  useEffect(() => {
    if (isOpen && accountId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/tasks/outlook/lists?accountId=${accountId}`)
        .then((res) => res.json())
        .then((data) => {
          setTaskLists(data);
          // Pre-select lists and set up initial mappings
          const initialSelected = new Set<string>();
          const initialMappings: Record<
            string,
            { projectId: string; isAutoScheduled: boolean }
          > = {};
          data.forEach((list: OutlookTaskList) => {
            if (list.projectMapping) {
              initialSelected.add(list.id);
              initialMappings[list.id] = {
                projectId: list.projectMapping.projectId,
                isAutoScheduled: list.projectMapping.isAutoScheduled,
              };
            }
          });
          setSelectedLists(initialSelected);
          setProjectMappings(initialMappings);
        })
        .catch((err) => {
          console.error("Failed to fetch task lists:", err);
          setError("Failed to load Outlook task lists. Please try again.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, accountId]);

  const handleImport = async () => {
    if (selectedLists.size === 0) {
      setError("Please select at least one task list to import.");
      return;
    }

    setImportInProgress(true);
    setError(null);
    setImportResults(null);

    try {
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      let allFailedTasks: FailedTask[] = [];

      // Process all selected lists
      for (const listId of selectedLists) {
        const response = await fetch("/api/tasks/outlook/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            listId,
            projectId:
              projectMappings[listId].projectId === "new"
                ? ""
                : projectMappings[listId].projectId,
            isAutoScheduled: projectMappings[listId].isAutoScheduled,
            options: {
              includeCompleted,
            },
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to import tasks");
        }

        console.log("Import result:", result); // Debug log

        totalImported += result.imported;
        totalSkipped += result.skipped;
        totalFailed += result.failed;

        // Collect failed tasks details if any
        if (result.failedTasks) {
          console.log("Failed tasks for list:", result.failedTasks); // Debug log
          const listName =
            taskLists.find((l) => l.id === listId)?.name || "Unknown List";
          allFailedTasks = [
            ...allFailedTasks,
            ...result.failedTasks.map((task: Omit<FailedTask, "listName">) => ({
              ...task,
              listName,
            })),
          ];
        }
      }

      console.log("All failed tasks:", allFailedTasks); // Debug log

      setImportResults({
        imported: totalImported,
        skipped: totalSkipped,
        failed: totalFailed,
        failedTasks: allFailedTasks,
      });
    } catch (err) {
      console.error("Failed to import tasks:", err);
      setError("Failed to import tasks. Please try again.");
    } finally {
      setImportInProgress(false);
    }
  };

  // If we have results, show the completion state
  if (importResults) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Complete</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <AlertDescription>
                <h3 className="font-medium mb-2">
                  Import completed successfully:
                </h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>{importResults.imported} tasks imported</li>
                  <li>{importResults.skipped} tasks skipped</li>
                  {importResults.failed > 0 && (
                    <li className="text-orange-700 dark:text-orange-400">
                      {importResults.failed} tasks failed
                      <Button
                        variant="link"
                        onClick={() => setShowFailureDetails(true)}
                        className="px-2 h-auto text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                      >
                        View Details
                      </Button>
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>

            {showFailureDetails && importResults.failedTasks && (
              <div className="mt-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Failed Tasks:</h4>
                <div className="space-y-2">
                  {importResults.failedTasks.map((task, index) => (
                    <Card
                      key={index}
                      className="bg-orange-50 dark:bg-orange-950"
                    >
                      <CardContent className="p-3">
                        <div className="font-medium text-orange-800 dark:text-orange-300">
                          {task.name}
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-400">
                          List: {task.listName}
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-400">
                          Error: {task.error}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {(isLoading || importInProgress) && <LoadingOverlay />}
        <DialogHeader>
          <DialogTitle>Import Outlook Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(80vh-8rem)] overflow-y-auto pr-4 -mr-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-sm font-medium">Select Task Lists</Label>
            <div className="mt-2 space-y-2">
              {taskLists.map((list) => (
                <Card key={list.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={list.id}
                        checked={selectedLists.has(list.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedLists);
                          if (checked) {
                            newSelected.add(list.id);
                            if (!projectMappings[list.id]) {
                              setProjectMappings({
                                ...projectMappings,
                                [list.id]: {
                                  projectId: "new",
                                  isAutoScheduled: true,
                                },
                              });
                            }
                          } else {
                            newSelected.delete(list.id);
                          }
                          setSelectedLists(newSelected);
                        }}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={list.id}
                          className="text-sm font-medium"
                        >
                          {list.name}
                          {list.isDefaultFolder && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Default)
                            </span>
                          )}
                        </Label>
                        {selectedLists.has(list.id) && (
                          <div className="mt-3 space-y-3">
                            <Select
                              value={
                                projectMappings[list.id]?.projectId || "new"
                              }
                              onValueChange={(value) =>
                                setProjectMappings({
                                  ...projectMappings,
                                  [list.id]: {
                                    ...projectMappings[list.id],
                                    projectId: value,
                                    isAutoScheduled:
                                      projectMappings[list.id]
                                        ?.isAutoScheduled ?? true,
                                  },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">
                                  Create New Project
                                </SelectItem>
                                {projects
                                  .filter((p) => p.status === "active")
                                  .map((project) => (
                                    <SelectItem
                                      key={project.id}
                                      value={project.id}
                                    >
                                      {project.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">
                                Auto-schedule tasks from this list
                              </div>
                              <Switch
                                checked={
                                  projectMappings[list.id]?.isAutoScheduled ??
                                  true
                                }
                                onCheckedChange={(checked) =>
                                  setProjectMappings({
                                    ...projectMappings,
                                    [list.id]: {
                                      ...projectMappings[list.id],
                                      isAutoScheduled: checked,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Include Completed Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Import tasks that are already completed
              </p>
            </div>
            <Switch
              checked={includeCompleted}
              onCheckedChange={setIncludeCompleted}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || importInProgress || selectedLists.size === 0}
          >
            {importInProgress ? "Importing..." : "Import Tasks"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
