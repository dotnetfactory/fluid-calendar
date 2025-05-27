"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

/**
 * Test component for Task Sync tRPC procedures
 * This component tests all the migrated task sync functionality
 */
export function TaskSyncTest() {
  const [providerId, setProviderId] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [results, setResults] = useState<string[]>([]);

  // Task Provider queries and mutations
  const { data: providers, refetch: refetchProviders } =
    trpc.taskSync.providers.getAll.useQuery({
      includeAccount: true,
      includeMappings: true,
    });

  const { data: provider, refetch: refetchProvider } =
    trpc.taskSync.providers.getById.useQuery(
      { providerId, includeAccount: true, includeMappings: true },
      { enabled: !!providerId }
    );

  const createProviderMutation = trpc.taskSync.providers.create.useMutation({
    onSuccess: () => {
      refetchProviders();
      addResult("✅ Provider created successfully");
    },
    onError: (error) =>
      addResult(`❌ Create provider failed: ${error.message}`),
  });

  const updateProviderMutation = trpc.taskSync.providers.update.useMutation({
    onSuccess: () => {
      refetchProvider();
      refetchProviders();
      addResult("✅ Provider updated successfully");
    },
    onError: (error) =>
      addResult(`❌ Update provider failed: ${error.message}`),
  });

  const deleteProviderMutation = trpc.taskSync.providers.delete.useMutation({
    onSuccess: () => {
      refetchProviders();
      addResult("✅ Provider deleted successfully");
    },
    onError: (error) =>
      addResult(`❌ Delete provider failed: ${error.message}`),
  });

  // Task Mapping queries and mutations
  const { data: mappings, refetch: refetchMappings } =
    trpc.taskSync.mappings.getAll.useQuery({
      includeProvider: true,
      includeProject: true,
    });

  const { data: mapping, refetch: refetchMapping } =
    trpc.taskSync.mappings.getById.useQuery(
      { mappingId, includeProvider: true, includeProject: true },
      { enabled: !!mappingId }
    );

  const createMappingMutation = trpc.taskSync.mappings.create.useMutation({
    onSuccess: () => {
      refetchMappings();
      addResult("✅ Mapping created successfully");
    },
    onError: (error) => addResult(`❌ Create mapping failed: ${error.message}`),
  });

  const updateMappingMutation = trpc.taskSync.mappings.update.useMutation({
    onSuccess: () => {
      refetchMapping();
      refetchMappings();
      addResult("✅ Mapping updated successfully");
    },
    onError: (error) => addResult(`❌ Update mapping failed: ${error.message}`),
  });

  const deleteMappingMutation = trpc.taskSync.mappings.delete.useMutation({
    onSuccess: () => {
      refetchMappings();
      addResult("✅ Mapping deleted successfully");
    },
    onError: (error) => addResult(`❌ Delete mapping failed: ${error.message}`),
  });

  // Sync operations
  const triggerSyncMutation = trpc.taskSync.sync.trigger.useMutation({
    onSuccess: (data) => addResult(`✅ Sync triggered: ${data.message}`),
    onError: (error) => addResult(`❌ Trigger sync failed: ${error.message}`),
  });

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const clearResults = () => setResults([]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Task Sync tRPC Test</h1>

      {/* Provider Tests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Task Providers</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-medium mb-2">
              All Providers ({providers?.length || 0})
            </h3>
            <div className="bg-gray-100 p-3 rounded max-h-32 overflow-y-auto">
              {providers?.map((p) => (
                <div key={p.id} className="text-sm">
                  {p.name} ({p.type}) - {p.syncEnabled ? "Enabled" : "Disabled"}
                </div>
              )) || "No providers found"}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Selected Provider</h3>
            <input
              type="text"
              placeholder="Provider ID"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <div className="bg-gray-100 p-3 rounded text-sm">
              {provider
                ? `${provider.name} (${provider.type})`
                : "No provider selected"}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() =>
              createProviderMutation.mutate({
                name: "Test Provider",
                type: "GOOGLE",
                syncEnabled: true,
              })
            }
            disabled={createProviderMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Create Test Provider
          </button>

          <button
            onClick={() =>
              providerId &&
              updateProviderMutation.mutate({
                providerId,
                name: "Updated Provider",
                syncEnabled: false,
              })
            }
            disabled={!providerId || updateProviderMutation.isPending}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Update Provider
          </button>

          <button
            onClick={() =>
              providerId && deleteProviderMutation.mutate({ providerId })
            }
            disabled={!providerId || deleteProviderMutation.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Delete Provider
          </button>
        </div>
      </div>

      {/* Mapping Tests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Task Mappings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-medium mb-2">
              All Mappings ({mappings?.length || 0})
            </h3>
            <div className="bg-gray-100 p-3 rounded max-h-32 overflow-y-auto">
              {mappings?.map((m) => (
                <div key={m.id} className="text-sm">
                  {m.externalListName} → {m.project?.name || "Unknown Project"}
                </div>
              )) || "No mappings found"}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Selected Mapping</h3>
            <input
              type="text"
              placeholder="Mapping ID"
              value={mappingId}
              onChange={(e) => setMappingId(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <div className="bg-gray-100 p-3 rounded text-sm">
              {mapping
                ? `${mapping.externalListName} → ${mapping.project?.name}`
                : "No mapping selected"}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() =>
              providerId &&
              createMappingMutation.mutate({
                providerId,
                externalListId: "test-list-id",
                externalListName: "Test List",
                projectId: "test-project-id",
                syncEnabled: true,
                direction: "incoming",
              })
            }
            disabled={!providerId || createMappingMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Create Test Mapping
          </button>

          <button
            onClick={() =>
              mappingId &&
              updateMappingMutation.mutate({
                mappingId,
                externalListName: "Updated List",
                syncEnabled: false,
              })
            }
            disabled={!mappingId || updateMappingMutation.isPending}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Update Mapping
          </button>

          <button
            onClick={() =>
              mappingId && deleteMappingMutation.mutate({ mappingId })
            }
            disabled={!mappingId || deleteMappingMutation.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Delete Mapping
          </button>

          <button
            onClick={() => triggerSyncMutation.mutate({ forceSync: true })}
            disabled={triggerSyncMutation.isPending}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Trigger Sync
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Test Results</h2>
          <button
            onClick={clearResults}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
          {results.length > 0
            ? results.map((result, index) => <div key={index}>{result}</div>)
            : "No test results yet..."}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-2">Migration Summary</h3>
        <p className="text-sm text-gray-700">
          ✅ Task Sync domain migrated to tRPC v11
          <br />
          ✅ 5 API routes replaced with tRPC procedures
          <br />
          ✅ Type-safe task provider and mapping operations
          <br />
          ✅ Comprehensive error handling and validation
          <br />✅ Business logic layer with proper authorization
        </p>
      </div>
    </div>
  );
}
