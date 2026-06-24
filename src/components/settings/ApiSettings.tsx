"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { CreateApiKeyModal } from "@/components/settings/CreateApiKeyModal";
import { SettingRow, SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApiSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      toast.error("Failed to load API keys.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/api-settings");
        if (res.ok) {
          const data = await res.json();
          setEnabled(Boolean(data.enabled));
        } else {
          setEnabled(false);
        }
      } catch {
        setEnabled(false);
      }
    })();
    loadKeys();
  }, [loadKeys]);

  const toggleEnabled = async (next: boolean) => {
    const previous = enabled;
    setEnabled(next); // optimistic
    try {
      const res = await fetch("/api/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(next ? "API access enabled." : "API access disabled.");
    } catch {
      setEnabled(previous ?? false);
      toast.error("Failed to update API access.");
    }
  };

  const revokeKey = async () => {
    if (!revokeTarget) return;
    try {
      const res = await fetch(`/api/api-keys/${revokeTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("API key revoked.");
      setRevokeTarget(null);
      loadKeys();
    } catch {
      toast.error("Failed to revoke API key.");
    }
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <SettingsSection
      title="API & Developer"
      description="Programmatic access to your tasks and calendar. Use API keys to let external tools (automation, meeting assistants, scripts) create and schedule items on your behalf."
    >
      <SettingRow
        label="Enable API access"
        description="When off, all of your API keys are rejected. Turn on to use the /api/v1 endpoints."
      >
        <Switch
          checked={enabled ?? false}
          disabled={enabled === null}
          onCheckedChange={toggleEnabled}
          aria-label="Enable API access"
        />
      </SettingRow>

      {enabled && (
        <SettingRow
          label="API keys"
          description="Keys are shown in full only once at creation. Revoke any key you no longer use."
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Create key
              </Button>
            </div>

            {activeKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active API keys yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Prefix</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Last used
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Created</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeKeys.map((k) => (
                      <tr key={k.id} className="border-t">
                        <td className="px-3 py-2">{k.name}</td>
                        <td className="px-3 py-2">
                          <code className="text-xs">{k.keyPrefix}…</code>
                        </td>
                        <td className="px-3 py-2">{formatDate(k.lastUsedAt)}</td>
                        <td className="px-3 py-2">{formatDate(k.createdAt)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeTarget(k)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SettingRow>
      )}

      <CreateApiKeyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadKeys}
      />

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Revoking <span className="font-medium">{revokeTarget?.name}</span>{" "}
            immediately stops any integration using it. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={revokeKey}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
