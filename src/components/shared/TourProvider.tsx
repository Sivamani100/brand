'use client';

/**
 * TourProvider — wraps dashboard content and automatically starts the
 * appropriate Shepherd.js onboarding tour for first-time users.
 *
 * - Checks `profile.tour_completed` on mount
 * - Launches brand or influencer tour based on `profile.role`
 * - Marks tour as completed on finish or cancel
 * - Exposes `restartTour()` via React context for the settings page
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import Shepherd from 'shepherd.js';

import '@/styles/tour-styles.css';

import { useUser } from '@/lib/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { getBrandTourSteps } from '@/lib/tours/brand-tour';
import { getInfluencerTourSteps } from '@/lib/tours/influencer-tour';

/* ─── Context ───────────────────────────────────────────────── */

interface TourContextValue {
  /** Re-launch the onboarding tour from step 1. */
  restartTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  restartTour: () => {},
});

/**
 * Hook to access tour controls from any descendant component.
 *
 * @example
 * ```tsx
 * const { restartTour } = useTour();
 * <button onClick={restartTour}>Replay tour</button>
 * ```
 */
export function useTour(): TourContextValue {
  return useContext(TourContext);
}

/* ─── Props ─────────────────────────────────────────────────── */

interface TourProviderProps {
  children: ReactNode;
}

/* ─── Component ─────────────────────────────────────────────── */

export function TourProvider({ children }: TourProviderProps) {
  const { profile, loading } = useUser();
  const tourRef = useRef<any>(null);

  /** Persist tour completion flag to Supabase. */
  const markTourCompleted = useCallback(async () => {
    if (!profile?.id) return;
    const supabase = createClient();
    await supabase
      .from('profiles')
      // @ts-expect-error tour_completed added in migration 20260619 but not yet in generated types
      .update({ tour_completed: true })
      .eq('id', profile.id);
  }, [profile?.id]);

  /** Build and start a Shepherd tour for the active role. */
  const startTour = useCallback(
    (role: string) => {
      // Tear down any existing tour instance
      if (tourRef.current) {
        tourRef.current.complete();
        tourRef.current = null;
      }

      const steps =
        role === 'brand' ? getBrandTourSteps() : getInfluencerTourSteps();

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          scrollTo: { behavior: 'smooth', block: 'center' },
        },
      });

      steps.forEach((step) => tour.addStep(step));

      tour.on('complete', markTourCompleted);
      tour.on('cancel', markTourCompleted);

      tourRef.current = tour;

      // Small delay so the DOM is settled after hydration
      requestAnimationFrame(() => {
        tour.start();
      });
    },
    [markTourCompleted],
  );

  /** Auto-start on first mount when tour hasn't been completed. */
  useEffect(() => {
    if (loading || !profile) return;

    // Only trigger for users who haven't completed the tour
    const tourCompleted = (profile as Record<string, unknown>).tour_completed;
    if (tourCompleted) return;

    const role = profile.role ?? 'brand';
    startTour(role);

    return () => {
      tourRef.current?.cancel();
      tourRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  /** Restart handler exposed via context. */
  const restartTour = useCallback(() => {
    const role = profile?.role ?? 'brand';
    startTour(role);
  }, [profile?.role, startTour]);

  return (
    <TourContext.Provider value={{ restartTour }}>
      {children}
    </TourContext.Provider>
  );
}
