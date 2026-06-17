"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

/** A single keyboard shortcut definition for display. */
interface ShortcutDef {
  keys: string[];
  description: string;
}

/** A named group of shortcuts. */
interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["/"], description: "Focus search input" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close modals" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["G", "H"], description: "Go to Home" },
      { keys: ["G", "C"], description: "Go to Cards / Discover" },
      { keys: ["G", "A"], description: "Go to Applications" },
      { keys: ["G", "M"], description: "Go to Messages" },
      { keys: ["G", "P"], description: "Go to Profile" },
      { keys: ["G", "N"], description: "Go to Notifications" },
    ],
  },
  {
    title: "Context",
    shortcuts: [
      { keys: ["←"], description: "Navigate back (mobile app bar)" },
      { keys: ["Enter"], description: "Open selected item" },
    ],
  },
];

/**
 * Modal dialog listing all available keyboard shortcuts.
 *
 * Opens when the user presses `?` — listens for the `open-shortcuts-modal`
 * custom event dispatched by the `useKeyboardShortcuts` hook.  Also closes
 * on the `close-modals` event.
 *
 * Shortcuts are grouped into **Global**, **Navigation**, and **Context**
 * sections. Each shortcut renders its keys using the shadcn `Kbd` component.
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal />
 * ```
 */
export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    window.addEventListener("open-shortcuts-modal", handleOpen);
    window.addEventListener("close-modals", handleClose);

    return () => {
      window.removeEventListener("open-shortcuts-modal", handleOpen);
      window.removeEventListener("close-modals", handleClose);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-text-primary">
                      {shortcut.description}
                    </span>
                    <KbdGroup>
                      {shortcut.keys.map((key, i) => (
                        <Kbd key={`${key}-${i}`}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
