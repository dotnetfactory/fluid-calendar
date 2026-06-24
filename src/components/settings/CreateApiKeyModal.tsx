"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateApiKeyModal({
  open,
  onOpenChange,
  onCreated,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  // The plaintext key is returned exactly once by the API and never again.
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setCreating(false);
    setCreatedKey(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the key.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCreatedKey(data.key);
      onCreated();
    } catch {
      toast.error("Failed to create API key.");
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    toast.success("Copied to clipboard.");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "Save your API key" : "Create API key"}
          </DialogTitle>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy this key now. For security it is shown{" "}
              <span className="font-medium">only once</span> and cannot be
              retrieved again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 text-xs">
                {createdKey}
              </code>
              <Button type="button" variant="outline" onClick={handleCopy}>
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="api-key-name">Key name</Label>
            <Input
              id="api-key-name"
              placeholder="e.g. Meeting-notes bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              A label to help you recognize where this key is used.
            </p>
          </div>
        )}

        <DialogFooter>
          {createdKey ? (
            <Button type="button" onClick={() => handleClose(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create key"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
