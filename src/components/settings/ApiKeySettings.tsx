"use client";

import { useCallback, useEffect, useState } from "react";

import { Copy, Eye, EyeOff, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewKeyResponse extends ApiKeyInfo {
  key: string;
}

export function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/api-keys");
      if (!response.ok) throw new Error("Failed to fetch API keys");
      const data = await response.json();
      setKeys(data);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
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

    setIsCreating(true);
    try {
      let expiresAt: string | null = null;
      if (newKeyExpiry !== "never") {
        const date = new Date();
        switch (newKeyExpiry) {
          case "30d":
            date.setDate(date.getDate() + 30);
            break;
          case "90d":
            date.setDate(date.getDate() + 90);
            break;
          case "1y":
            date.setFullYear(date.getFullYear() + 1);
            break;
        }
        expiresAt = date.toISOString();
      }

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create API key");
      }

      const data: NewKeyResponse = await response.json();
      setNewlyCreatedKey(data.key);
      setShowKey(true);

      // Refresh the key list
      await fetchKeys();

      toast.success("API key created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke API key");
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyKey = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      toast.success("API key copied to clipboard");
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewKeyName("");
    setNewKeyExpiry("never");
    setNewlyCreatedKey(null);
    setShowKey(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Create and manage API keys for programmatic access to your
                Fluid Calendar data. Keys use Bearer token authentication.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">No API keys</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an API key to start using the API programmatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apiKey.name}</span>
                      {isExpired(apiKey.expiresAt) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5">
                        {apiKey.keyPrefix}...
                      </code>
                      <span>Created {formatDate(apiKey.createdAt)}</span>
                      <span>
                        Last used{" "}
                        {apiKey.lastUsedAt
                          ? formatDate(apiKey.lastUsedAt)
                          : "never"}
                      </span>
                      {apiKey.expiresAt && !isExpired(apiKey.expiresAt) && (
                        <span>Expires {formatDate(apiKey.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(apiKey.id)}
                    disabled={revokingId === apiKey.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {revokingId === apiKey.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
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
          <CardDescription>
            How to authenticate with the API using your key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">
              Include your API key in the <code className="rounded bg-muted px-1.5 py-0.5">Authorization</code> header:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{`curl -H "Authorization: Bearer fc_your_key_here" \\
  ${typeof window !== "undefined" ? window.location.origin : "https://your-instance.com"}/api/tasks`}</code>
            </pre>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              API keys provide the same access as your user account. Keep them
              secret and never share them publicly.
            </p>
            <p>
              View the full{" "}
              <a
                href="/api-docs"
                className="text-primary hover:underline"
              >
                API documentation
              </a>{" "}
              for all available endpoints.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newlyCreatedKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {newlyCreatedKey
                ? "Copy your API key now. You won't be able to see it again."
                : "Give your API key a descriptive name so you can identify it later."}
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={showKey ? "text" : "password"}
                    value={newlyCreatedKey}
                    className="pr-20 font-mono text-sm"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleCopyKey}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Make sure to copy your API key now. You will not be able to see
                it again.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., CI/CD Pipeline, Mobile App"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) {
                      handleCreate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyExpiry">Expiration</Label>
                <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">No expiration</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                    <SelectItem value="1y">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {newlyCreatedKey ? (
              <Button onClick={handleCloseCreateDialog}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseCreateDialog}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !newKeyName.trim()}
                >
                  {isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
