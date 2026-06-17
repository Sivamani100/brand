"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/** Props for the {@link useKeyboardShortcuts} hook. */
export interface UseKeyboardShortcutsOptions {
  /** The authenticated user's role — determines correct dashboard paths. */
  role: "brand" | "influencer";
  /** Set to `false` to disable all shortcuts (e.g. while a modal is managing its own keys). */
  enabled?: boolean;
}

/**
 * Returns `true` when focus is inside an element where the user is actively
 * typing (input, textarea, contenteditable, or `[role="textbox"]`).
 */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.getAttribute("role") === "textbox") return true;
  return false;
}

/**
 * Global keyboard shortcuts hook.
 *
 * Registers document-level key listeners for:
 *
 * | Key(s)     | Action                                         |
 * |------------|------------------------------------------------|
 * | `?`        | Dispatch `open-shortcuts-modal` custom event    |
 * | `/`        | Focus the global search input (prevents default)|
 * | `Escape`   | Dispatch `close-modals` custom event            |
 * | `g` then `h` | Navigate to dashboard home                   |
 * | `g` then `c` | Navigate to cards                            |
 * | `g` then `a` | Navigate to applications                     |
 * | `g` then `m` | Navigate to chats                            |
 * | `g` then `p` | Navigate to profile                          |
 * | `g` then `n` | Navigate to notifications                    |
 *
 * All shortcuts are disabled when the user is typing in an input, textarea,
 * or contenteditable element.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({ role: "brand" });
 * ```
 */
export function useKeyboardShortcuts({
  role,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const router = useRouter();

  /** Tracks the first key of a sequential chord (e.g. `g`). */
  const pendingChord = useRef<string | null>(null);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefix = `/dashboard/${role}`;

  /** Navigation targets for `g + <key>` chords. */
  const chordTargets: Record<string, string> = {
    h: prefix,
    c: role === "brand" ? `${prefix}/cards` : `${prefix}/discover`,
    a:
      role === "brand"
        ? `${prefix}/applications`
        : `${prefix}/my-applications`,
    m: `${prefix}/chats`,
    p: `${prefix}/profile`,
    n: `${prefix}/notifications`,
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      // Ignore when user is typing
      if (isTyping()) return;
      // Ignore when modifier keys are held (except Shift for `?`)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;

      // --- Sequential chord handling ---
      if (pendingChord.current === "g") {
        // Resolve the chord
        pendingChord.current = null;
        if (chordTimer.current) {
          clearTimeout(chordTimer.current);
          chordTimer.current = null;
        }
        const target = chordTargets[key];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      // Start a chord with `g`
      if (key === "g") {
        pendingChord.current = "g";
        // Auto-cancel chord after 800ms
        chordTimer.current = setTimeout(() => {
          pendingChord.current = null;
          chordTimer.current = null;
        }, 800);
        return;
      }

      // --- Single-key shortcuts ---
      if (key === "?") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
        return;
      }

      if (key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
        return;
      }

      if (key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-modals"));
        return;
      }
    },
    [enabled, role, router, chordTargets]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (chordTimer.current) clearTimeout(chordTimer.current);
    };
  }, [handleKeyDown]);
}
