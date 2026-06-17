'use client';

/**
 * ContextHelp — a small help-circle icon that reveals a tooltip with
 * contextual guidance on hover or focus.
 *
 * Uses the existing shadcn-style Tooltip primitives so styling stays
 * consistent across the app.
 *
 * @example
 * ```tsx
 * <ContextHelp content="This score reflects audience engagement quality." />
 * ```
 */

import { HelpCircle } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContextHelpProps {
  /** The help text displayed inside the tooltip. */
  content: string;
  /** Which side the tooltip appears on relative to the icon. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Renders a small `HelpCircle` icon (14 px, muted colour) that shows
 * a tooltip with the provided content on hover/focus.
 */
export function ContextHelp({ content, side = 'top' }: ContextHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          data-tour="context-help"
          className="inline-flex cursor-help items-center"
          aria-label="More info"
        >
          <HelpCircle className="size-3.5 text-[var(--color-text-muted)]" />
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
