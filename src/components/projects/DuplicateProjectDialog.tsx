"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

import { useProjectStore } from "@/store/project";

import { Project } from "@/types/project";

interface DuplicateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function DuplicateProjectDialog({
  isOpen,
  onClose,
  project,
}: DuplicateProjectDialogProps) {
  const { duplicateProject } = useProjectStore();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(`Copy of ${project.name}`);
    }
  }, [isOpen, project.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await duplicateProject(project.id, name.trim());
      toast.success("Project duplicated");
      onClose();
    } catch (error) {
      console.error("Error duplicating project:", error);
      toast.error("Failed to duplicate project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        {isSubmitting && <LoadingOverlay />}
        <DialogHeader>
          <DialogTitle>Duplicate Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This creates a new project with all incomplete tasks from{" "}
            <strong>{project.name}</strong>.
          </p>

          <div>
            <Label htmlFor="duplicate-name">New project name</Label>
            <Input
              id="duplicate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
