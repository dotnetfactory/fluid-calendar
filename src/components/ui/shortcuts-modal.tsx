import * as Dialog from "@radix-ui/react-dialog";
import { IoClose } from "react-icons/io5";
import { commandRegistry } from "@/lib/commands/registry";
import { Command } from "@/lib/commands/types";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Group commands by section
  const commandsBySection = commandRegistry.getAll().reduce((acc, command) => {
    if (command.shortcut) {
      if (!acc[command.section]) {
        acc[command.section] = [];
      }
      acc[command.section].push(command);
    }
    return acc;
  }, {} as Record<Command["section"], Command[]>);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Keyboard Shortcuts
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1.5 hover:bg-gray-100">
              <IoClose className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            {Object.entries(commandsBySection).map(([section, commands]) => (
              <div key={section}>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  {section}
                </h3>
                <div className="space-y-2">
                  {commands.map((command) => (
                    <div
                      key={command.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{command.title}</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 text-xs">
                        {command.shortcut}
                      </kbd>
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
