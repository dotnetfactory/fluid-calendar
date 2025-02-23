"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineSearch,
  HiX,
} from "react-icons/hi";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Reset search when opening/closing
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
          <Dialog.Title className="sr-only">Command Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search commands and navigate the application
          </Dialog.Description>

          <Command
            className={cn(
              "rounded-lg border shadow-lg bg-white overflow-hidden",
              "transition-all transform",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
              "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
            )}
          >
            <div className="flex items-center border-b px-3">
              <HiOutlineSearch className="w-5 h-5 text-gray-400" />
              <Command.Input
                placeholder="Type a command or search..."
                className="flex-1 h-12 px-3 text-base outline-none placeholder:text-gray-400"
                value={search}
                onValueChange={setSearch}
              />
              {search && (
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <HiX className="w-5 h-5" />
                </button>
              )}
              <Dialog.Close
                className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                aria-label="Close command menu"
              >
                <HiX className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                No results found.
              </Command.Empty>

              <Command.Group heading="Navigation">
                <Command.Item
                  className="px-2 py-2 rounded-md text-sm cursor-pointer flex items-center gap-2 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                  onSelect={() => {
                    router.push("/");
                    onOpenChange(false);
                  }}
                >
                  <HiOutlineCalendar className="w-4 h-4" />
                  <span>Go to Calendar</span>
                </Command.Item>
                <Command.Item
                  className="px-2 py-2 rounded-md text-sm cursor-pointer flex items-center gap-2 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                  onSelect={() => {
                    router.push("/tasks");
                    onOpenChange(false);
                  }}
                >
                  <HiOutlineClipboardList className="w-4 h-4" />
                  <span>Go to Tasks</span>
                </Command.Item>
                <Command.Item
                  className="px-2 py-2 rounded-md text-sm cursor-pointer flex items-center gap-2 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                  onSelect={() => {
                    router.push("/settings");
                    onOpenChange(false);
                  }}
                >
                  <HiOutlineCog className="w-4 h-4" />
                  <span>Go to Settings</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
