import type { StepOptions, StepOptionsButton } from "shepherd.js";

/**
 * Brand onboarding tour step definitions for Shepherd.js.
 *
 * Returns an array of Shepherd step configuration objects that walk
 * a new brand user through the core dashboard actions: navigation,
 * posting a card, discovering influencers, reviewing applications,
 * and staying notified.
 */
export function getBrandTourSteps(): StepOptions[] {
  const totalSteps = 6;

  /**
   * Helper — builds the standard button set for a given step index.
   * Every step has a skip button plus prev / next (or finish) controls.
   */
  const buildButtons = (
    stepIndex: number,
  ): StepOptionsButton[] => {
    const buttons: StepOptionsButton[] = [
      {
        text: 'Skip tour',
        classes: 'shepherd-button-secondary shepherd-cancel-link',
        action(): void {
          (this as unknown as any).cancel();
        },
      },
    ];

    if (stepIndex > 0) {
      buttons.push({
        text: '← Prev',
        classes: 'shepherd-button-secondary',
        action(): void {
          (this as unknown as any).back();
        },
      });
    }

    // Last step gets special CTA buttons instead of Next
    if (stepIndex === totalSteps - 1) {
      buttons.push(
        {
          text: 'Explore first',
          classes: 'shepherd-button-secondary',
          action(): void {
            (this as unknown as any).complete();
          },
        },
        {
          text: 'Post a Card',
          classes: 'shepherd-button-primary',
          action(): void {
            (this as unknown as any).complete();
            window.location.href = '/dashboard/brand/cards/new';
          },
        },
      );
    } else {
      buttons.push({
        text: 'Next →',
        classes: 'shepherd-button-primary',
        action(): void {
          (this as unknown as any).next();
        },
      });
    }

    return buttons;
  };

  /** Helper — wraps text with step indicator badge. */
  const withIndicator = (text: string, step: number): string =>
    `<p class="shepherd-step-indicator">Step ${step} of ${totalSteps}</p>${text}`;

  return [
    {
      id: 'welcome',
      attachTo: { element: '[data-tour="sidebar-nav"]', on: 'right' },
      title: 'Your command centre',
      text: withIndicator(
        'Everything lives here. Your cards, applications, chats — one click away.',
        1,
      ),
      buttons: buildButtons(0),
    },
    {
      id: 'post-card',
      attachTo: { element: '[data-tour="post-card-btn"]', on: 'bottom' },
      title: 'Start here',
      text: withIndicator(
        'Post a Card to tell creators what you need. Takes 3 minutes.',
        2,
      ),
      buttons: buildButtons(1),
    },
    {
      id: 'discover-influencers',
      attachTo: { element: '[data-tour="influencers-nav"]', on: 'right' },
      title: 'Or browse first',
      text: withIndicator(
        'Not sure what you need? Browse 2000+ creators and invite them directly.',
        3,
      ),
      buttons: buildButtons(2),
    },
    {
      id: 'applications',
      attachTo: { element: '[data-tour="applications-nav"]', on: 'right' },
      title: 'Applications come here',
      text: withIndicator(
        "When creators apply, you'll see them here. Accept to open a chat room.",
        4,
      ),
      buttons: buildButtons(3),
    },
    {
      id: 'notifications',
      attachTo: { element: '[data-tour="notification-bell"]', on: 'bottom' },
      title: 'Stay in the loop',
      text: withIndicator(
        'New applications, messages, and updates appear here in real time.',
        5,
      ),
      buttons: buildButtons(4),
    },
    {
      id: 'complete',
      // Centered modal — no attachTo
      title: '🎉 You\u2019re all set',
      text: withIndicator(
        'Post your first Card now — it takes under 3 minutes.',
        6,
      ),
      buttons: buildButtons(5),
    },
  ];
}
