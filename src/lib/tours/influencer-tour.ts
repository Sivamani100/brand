import type { StepOptions, StepOptionsButton } from "shepherd.js";

/**
 * Influencer onboarding tour step definitions for Shepherd.js.
 *
 * Returns an array of Shepherd step configuration objects that guide
 * a new influencer through matched cards, browsing, applying, and
 * building their portfolio.
 */
export function getInfluencerTourSteps(): StepOptions[] {
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

    // Last step gets special CTA buttons
    if (stepIndex === totalSteps - 1) {
      buttons.push({
        text: 'Browse Cards',
        classes: 'shepherd-button-primary',
        action(): void {
          (this as unknown as any).complete();
          window.location.href = '/dashboard/influencer/discover';
        },
      });
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
      // Centered modal — no attachTo
      title: 'Welcome to Brand',
      text: withIndicator(
        'Brands post collaborations. You apply. Simple.',
        1,
      ),
      buttons: buildButtons(0),
    },
    {
      id: 'home-feed',
      attachTo: { element: '.matched-cards-section', on: 'bottom' },
      title: 'Cards matched for you',
      text: withIndicator(
        'These cards are picked based on your niche and audience. New matches appear daily.',
        2,
      ),
      buttons: buildButtons(1),
    },
    {
      id: 'discover',
      attachTo: { element: '[data-tour="discover-nav"]', on: 'right' },
      title: 'Browse everything',
      text: withIndicator(
        'Want to see all available collaborations? Browse the full catalogue here.',
        3,
      ),
      buttons: buildButtons(2),
    },
    {
      id: 'apply',
      attachTo: { element: '[data-tour="apply-btn"]', on: 'bottom' },
      title: 'Apply in 2 steps',
      text: withIndicator(
        'Found something you like? Apply in just two steps — pitch and portfolio.',
        4,
      ),
      buttons: buildButtons(3),
    },
    {
      id: 'portfolio',
      attachTo: { element: '[data-tour="portfolio-nav"]', on: 'right' },
      title: 'Build your portfolio',
      text: withIndicator(
        'Showcase your best work. A strong portfolio increases your acceptance rate.',
        5,
      ),
      buttons: buildButtons(4),
    },
    {
      id: 'complete',
      // Centered modal — no attachTo
      title: 'Ready to go',
      text: withIndicator(
        'You\u2019re all set! Start browsing cards matched to your niche.',
        6,
      ),
      buttons: buildButtons(5),
    },
  ];
}
