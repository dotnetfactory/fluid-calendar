import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";
import { useProjectStore } from "@/store/project";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Switch } from "@/components/ui/switch";

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

interface OutlookTaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
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
    Record<string, string>
  >({});
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [importInProgress, setImportInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const initialMappings: Record<string, string> = {};
          data.forEach((list: OutlookTaskList) => {
            if (list.projectMapping) {
              initialSelected.add(list.id);
              initialMappings[list.id] = list.projectMapping.projectId;
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

    try {
      const response = await fetch("/api/tasks/outlook/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          listId: Array.from(selectedLists)[0],
          projectId: projectMappings[Array.from(selectedLists)[0]],
          options: {
            includeCompleted,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to import tasks");
      }

      // Close modal on success
      onClose();
    } catch (err) {
      console.error("Failed to import tasks:", err);
      setError("Failed to import tasks. Please try again.");
    } finally {
      setImportInProgress(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg z-[10000]">
          {(isLoading || importInProgress) && <LoadingOverlay />}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Import Outlook Tasks
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100">
              <IoClose className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                Select Task Lists
              </label>
              <div className="mt-2 space-y-2">
                {taskLists.map((list) => (
                  <div key={list.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={list.id}
                      checked={selectedLists.has(list.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedLists);
                        if (e.target.checked) {
                          newSelected.add(list.id);
                        } else {
                          newSelected.delete(list.id);
                        }
                        setSelectedLists(newSelected);
                      }}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={list.id}
                        className="block text-sm font-medium text-gray-900"
                      >
                        {list.name}
                        {list.isDefaultFolder && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Default)
                          </span>
                        )}
                      </label>
                      {selectedLists.has(list.id) && (
                        <div className="mt-1">
                          <select
                            value={projectMappings[list.id] || ""}
                            onChange={(e) =>
                              setProjectMappings({
                                ...projectMappings,
                                [list.id]: e.target.value,
                              })
                            }
                            className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Create New Project</option>
                            {projects
                              .filter((p) => p.status === "active")
                              .map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Include Completed Tasks
                </label>
                <p className="text-sm text-gray-500">
                  Import tasks that are already completed
                </p>
              </div>
              <Switch
                checked={includeCompleted}
                onCheckedChange={setIncludeCompleted}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={
                  isLoading || importInProgress || selectedLists.size === 0
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importInProgress ? "Importing..." : "Import Tasks"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
