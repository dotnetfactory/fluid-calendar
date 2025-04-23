"use client";

import { useEffect, useMemo, useState } from "react";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import {
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineLightningBolt,
} from "react-icons/hi";

import { cn, formatShortcut } from "@/lib/utils";

import { useCommands } from "@/hooks/useCommands";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [showAllCommands, setShowAllCommands] = useState(false);
  const { searchCommands, executeCommand, getAllCommands } = useCommands();

  // Get filtered commands based on search or show all commands
  const commands = useMemo(() => {
    if (showAllCommands) {
      return getAllCommands();
    }
    return search ? searchCommands(search) : [];
  }, [search, searchCommands, showAllCommands, getAllCommands]);

  // Reset search and showAllCommands when opening/closing
  useEffect(() => {
    if (!open) {
      setSearch("");
      setShowAllCommands(false);
    }
  }, [open]);

  // Group commands by section for better organization
  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof commands> = {};

    commands.forEach((command) => {
      if (!groups[command.section]) {
        groups[command.section] = [];
      }
      groups[command.section].push(command);
    });

    return groups;
  }, [commands]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2">
          <Dialog.Title className="sr-only">Command Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search commands and navigate the application
          </Dialog.Description>

          <Command
            className={cn(
              "overflow-hidden rounded-lg border bg-white shadow-lg",
              "transform transition-all",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
          >
            <div className="flex items-center border-b px-3">
              <HiOutlineSearch className="h-5 w-5 text-gray-400" />
              <Command.Input
                placeholder="Type a command or search..."
                className="h-12 flex-1 px-3 text-base outline-none placeholder:text-gray-400"
                value={search}
                onValueChange={setSearch}
              />
              {search && (
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <HiX className="h-5 w-5" />
                </button>
              )}
              {!search && (
                <kbd className="hidden items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400 sm:flex">
                  <span className="text-xs">⌘</span>
                  <span>K</span>
                </kbd>
              )}
              <Dialog.Close
                className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                aria-label="Close command menu"
              >
                <HiX className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              {!search && !showAllCommands && (
                <div className="px-2 py-3 text-sm text-gray-500">
                  <p className="mb-2">
                    Start typing to search commands or try these:
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        executeCommand("navigation.calendar");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineCalendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Go to Calendar</span>
                      <kbd className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        gc
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        executeCommand("navigation.tasks");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineClipboardList className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Go to Tasks</span>
                      <kbd className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        gt
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        executeCommand("navigation.focus");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineLightningBolt className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Go to Focus</span>
                      <kbd className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        gf
                      </kbd>
                    </div>
                    <div
                      className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-100"
                      onClick={() => {
                        executeCommand("navigation.settings");
                        onOpenChange(false);
                      }}
                    >
                      <HiOutlineCog className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Go to Settings</span>
                      <kbd className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        gs
                      </kbd>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowAllCommands(true)}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      <HiOutlineCollection className="h-4 w-4" />
                      Show all commands
                    </button>
                  </div>
                </div>
              )}

              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                No results found. Try a different search term.
              </Command.Empty>

              {(commands.length > 0 || showAllCommands) &&
                Object.entries(groupedCommands).map(
                  ([section, sectionCommands]) => (
                    <Command.Group
                      key={section}
                      heading={
                        section.charAt(0).toUpperCase() + section.slice(1)
                      }
                    >
                      {sectionCommands.map((command) => {
                        const Icon = command.icon;
                        return (
                          <Command.Item
                            key={command.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-700"
                            onSelect={() => {
                              executeCommand(command.id);
                              onOpenChange(false);
                            }}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{command.title}</span>
                            {command.shortcut && (
                              <kbd className="ml-auto text-xs text-gray-400">
                                {formatShortcut(command.shortcut)}
                              </kbd>
                            )}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  )
                )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
