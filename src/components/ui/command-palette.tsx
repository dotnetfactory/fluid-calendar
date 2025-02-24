"use client";

import { useEffect, useState, useMemo } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  HiOutlineSearch,
  HiX,
} from "react-icons/hi";
import { useCommands } from "@/hooks/useCommands";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const { searchCommands, executeCommand } = useCommands();

  // Get filtered commands based on search
  const commands = useMemo(() => {
    return search ? searchCommands(search) : [];
  }, [search, searchCommands]);

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
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[640px] z-50">
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

              {commands.length > 0 && (
                <Command.Group heading="Commands">
                  {commands.map((command) => {
                    const Icon = command.icon;
                    return (
                      <Command.Item
                        key={command.id}
                        className="px-2 py-2 rounded-md text-sm cursor-pointer flex items-center gap-2 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                        onSelect={() => {
                          executeCommand(command.id);
                          onOpenChange(false);
                        }}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{command.title}</span>
                        {command.shortcut && (
                          <kbd className="ml-auto text-xs text-gray-400">
                            {command.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
