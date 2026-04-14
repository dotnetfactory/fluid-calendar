"use client";

import { useCallback, useEffect, useState } from "react";

import { Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string | null;
  createdAt: string;
}

export function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        setKeys(await res.json());
      }
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create API key");
      }

      const data = await res.json();
      setRevealedKey(data.key);
      setNewKeyName("");
      await fetchKeys();
      toast.success("API key created. Copy it now — it won't be shown again.");
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? Any tools using this key will stop working.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete API key");
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Create API keys for external tools to access FluidCalendar.
            Keys authenticate as your user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new key */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. OmniFocus Sync"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Key
            </Button>
          </div>

          {/* Revealed key (shown only once after creation) */}
          {revealedKey && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="mb-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Copy this key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                  {revealedKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(revealedKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setRevealedKey(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Key list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No API keys yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {key.prefix}{"..."} · Created{" "}
                        {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsed && (
                          <>
                            {" "}· Last used{" "}
                            {new Date(key.lastUsed).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id, key.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Include the API key as a Bearer token in the Authorization header:
          </p>
          <code className="block rounded bg-muted px-4 py-3 text-sm font-mono">
            curl -H &quot;Authorization: Bearer fc_your_key_here&quot; http://localhost:3000/api/tasks
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
