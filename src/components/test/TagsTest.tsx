"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

/**
 * Test component to verify tRPC tags integration
 * This can be removed once we confirm everything works
 */
export function TagsTest() {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  // tRPC hooks
  const { data: tags, isLoading, error, refetch } = trpc.tags.getAll.useQuery();
  const createTagMutation = trpc.tags.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewTagName("");
    },
  });
  const deleteTagMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createTagMutation.mutate({
        name: newTagName.trim(),
        color: newTagColor,
      });
    }
  };

  const handleDeleteTag = (id: string) => {
    deleteTagMutation.mutate({ id });
  };

  if (isLoading) {
    return <div className="p-4">Loading tags...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading tags: {error.message}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">tRPC Tags Test</h2>

      {/* Create Tag Form */}
      <form onSubmit={handleCreateTag} className="mb-6 space-y-3">
        <div>
          <label htmlFor="tagName" className="block text-sm font-medium mb-1">
            Tag Name
          </label>
          <input
            id="tagName"
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tag name"
            disabled={createTagMutation.isPending}
          />
        </div>
        <div>
          <label htmlFor="tagColor" className="block text-sm font-medium mb-1">
            Tag Color
          </label>
          <input
            id="tagColor"
            type="color"
            value={newTagColor}
            onChange={(e) => setNewTagColor(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md"
            disabled={createTagMutation.isPending}
          />
        </div>
        <button
          type="submit"
          disabled={createTagMutation.isPending || !newTagName.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTagMutation.isPending ? "Creating..." : "Create Tag"}
        </button>
        {createTagMutation.error && (
          <p className="text-red-600 text-sm">
            Error: {createTagMutation.error.message}
          </p>
        )}
      </form>

      {/* Tags List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Tags ({tags?.length || 0})
        </h3>
        {tags && tags.length > 0 ? (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: tag.color || "#gray" }}
                  />
                  <span className="font-medium">{tag.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  disabled={deleteTagMutation.isPending}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {deleteTagMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">
            No tags found. Create one above!
          </p>
        )}
      </div>
    </div>
  );
}
