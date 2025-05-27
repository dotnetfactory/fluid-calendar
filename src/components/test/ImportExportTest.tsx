"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

export function ImportExportTest() {
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [importData, setImportData] = useState("");

  // Export tasks query
  const {
    data: exportData,
    isLoading: isExporting,
    refetch: exportTasks,
  } = trpc.importExport.exportTasks.useQuery(
    { includeCompleted },
    { enabled: false }
  );

  // Import tasks mutation
  const importTasksMutation = trpc.importExport.importTasks.useMutation({
    onSuccess: (data) => {
      console.log("Import successful:", data);
    },
    onError: (error) => {
      console.error("Import failed:", error);
    },
  });

  const handleExport = () => {
    exportTasks();
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      importTasksMutation.mutate(data);
    } catch (error) {
      console.error("Invalid JSON:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Import/Export Test</h2>

      {/* Export Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Export Tasks</h3>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="mr-2"
            />
            Include completed tasks
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isExporting ? "Exporting..." : "Export Tasks"}
        </button>

        {exportData && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Export Result:</h4>
            <div className="text-sm text-gray-600 mb-2">
              Tasks: {exportData.tasks.length}, Projects:{" "}
              {exportData.projects.length}, Tags: {exportData.tags.length}
            </div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(exportData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Import Section */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Import Tasks</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Import Data (JSON):
          </label>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste exported JSON data here..."
            className="w-full h-32 p-2 border rounded text-sm"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={importTasksMutation.isPending || !importData.trim()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {importTasksMutation.isPending ? "Importing..." : "Import Tasks"}
        </button>

        {importTasksMutation.data && (
          <div className="mt-4 p-2 bg-green-100 rounded">
            <p className="text-green-800">
              Import successful! Imported {importTasksMutation.data.imported}{" "}
              tasks.
            </p>
          </div>
        )}

        {importTasksMutation.error && (
          <div className="mt-4 p-2 bg-red-100 rounded">
            <p className="text-red-800">
              Import failed: {importTasksMutation.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
