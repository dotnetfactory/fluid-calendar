import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";

import { commandRegistry } from "@/lib/commands/registry";
import { Command } from "@/lib/commands/types";
import { formatShortcut } from "@/lib/utils";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Group commands by section
  const commandsBySection = commandRegistry.getAll().reduce(
    (acc, command) => {
      if (command.shortcut) {
        if (!acc[command.section]) {
          acc[command.section] = [];
        }
        acc[command.section].push(command);
      }
      return acc;
    },
    {} as Record<Command["section"], Command[]>
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Keyboard Shortcuts
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-muted">
              <IoClose className="h-5 w-5 text-foreground" />
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            {Object.entries(commandsBySection).map(([section, commands]) => (
              <div key={section}>
                <h3 className="mb-2 text-sm font-medium uppercase text-muted-foreground">
                  {section}
                </h3>
                <div className="space-y-2">
                  {commands.map((command) => (
                    <div
                      key={command.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{command.title}</span>
                      {formatShortcut(command.shortcut) && (
                        <div className="flex-shrink-0">
                          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {formatShortcut(command.shortcut)}
                          </kbd>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
