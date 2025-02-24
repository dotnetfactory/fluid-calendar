"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";
import { Project } from "@/types/project";
import { useProjectStore } from "@/store/project";
import { useState } from "react";

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  taskCount: number;
}

export function DeleteProjectDialog({
  isOpen,
  onClose,
  project,
  taskCount,
}: DeleteProjectDialogProps) {
  const { deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      onClose();
      project.onClose?.();
    } catch (error) {
      console.error("Error deleting project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow">
          <Dialog.Title className="m-0 text-[17px] font-medium">
            Delete Project
          </Dialog.Title>
          <Dialog.Description className="mt-4 mb-5 text-[15px] leading-normal">
            <p className="mb-3">
              Are you sure you want to delete <strong>{project.name}</strong>?
            </p>
            <p className="font-bold text-red-600 mb-3">
              ⚠️ This action cannot be undone. The project will be permanently
              deleted.
            </p>
            {taskCount > 0 && (
              <p className="text-red-600">
                This will also delete {taskCount} task
                {taskCount === 1 ? "" : "s"} associated with this project.
              </p>
            )}
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-4">
            <button
              className="inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] text-[15px] leading-none outline-none focus:shadow-[0_0_0_2px] focus:shadow-black bg-gray-200 hover:bg-gray-300"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className="inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] text-[15px] leading-none text-white outline-none focus:shadow-[0_0_0_2px] focus:shadow-red-700 bg-red-600 hover:bg-red-700 disabled:opacity-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-[10px] top-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:shadow-black hover:bg-gray-100"
              aria-label="Close"
              disabled={isDeleting}
            >
              <IoClose />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
