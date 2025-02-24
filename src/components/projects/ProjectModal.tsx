"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";
import { Project, ProjectStatus } from "@/types/project";
import { useProjectStore } from "@/store/project";
import { DeleteProjectDialog } from "./DeleteProjectDialog";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
}

export function ProjectModal({ isOpen, onClose, project }: ProjectModalProps) {
  const { createProject, updateProject } = useProjectStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#E5E7EB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setName(project.name);
      setDescription(project.description || "");
      setColor(project.color || "#E5E7EB");
    } else if (!project && isOpen) {
      setName("");
      setDescription("");
      setColor("#E5E7EB");
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (project) {
        await updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color: color === "#E5E7EB" ? undefined : color,
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          color: color === "#E5E7EB" ? undefined : color,
          status: ProjectStatus.ACTIVE,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow">
            <Dialog.Title className="m-0 text-[17px] font-medium">
              {project ? "Edit Project" : "Create Project"}
            </Dialog.Title>
            <form onSubmit={handleSubmit}>
              <fieldset className="mb-4 mt-4">
                <label
                  className="block text-[15px] leading-normal mb-2.5"
                  htmlFor="name"
                >
                  Name
                </label>
                <input
                  className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </fieldset>
              <fieldset className="mb-4">
                <label
                  className="block text-[15px] leading-normal mb-2.5"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  className="inline-flex min-h-[100px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] py-[10px] text-[15px] leading-normal shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px] border-gray-400"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </fieldset>
              <fieldset className="mb-4">
                <label
                  className="block text-[15px] leading-normal mb-2.5"
                  htmlFor="color"
                >
                  Color
                </label>
                <input
                  type="color"
                  className="h-[35px] w-full rounded-[4px]"
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </fieldset>
              <div className="mt-6 flex justify-between">
                {project && (
                  <button
                    type="button"
                    className="inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] text-[15px] leading-none text-white outline-none focus:shadow-[0_0_0_2px] focus:shadow-red-700 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isSubmitting}
                  >
                    Delete Project
                  </button>
                )}
                <div className="flex gap-4 ml-auto">
                  <button
                    type="button"
                    className="inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] text-[15px] leading-none outline-none focus:shadow-[0_0_0_2px] focus:shadow-black bg-gray-200 hover:bg-gray-300"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] text-[15px] leading-none text-white outline-none focus:shadow-[0_0_0_2px] focus:shadow-blue-700 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Project"}
                  </button>
                </div>
              </div>
            </form>
            <Dialog.Close asChild>
              <button
                className="absolute right-[10px] top-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:shadow-black hover:bg-gray-100"
                aria-label="Close"
                disabled={isSubmitting}
              >
                <IoClose />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {project && (
        <DeleteProjectDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          project={{ ...project, onClose }}
          taskCount={project._count?.tasks || 0}
        />
      )}
    </>
  );
}
