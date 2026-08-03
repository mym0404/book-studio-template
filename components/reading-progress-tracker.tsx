'use client';

import { useEffect } from 'react';
import {
  getTextQuoteSelector,
  isTextQuoteSelector,
  restoreTextQuoteSelector,
} from '@/lib/text-quote-selector';

export const ReadingProgressTracker = ({ pathname }: { pathname: string }) => {
  useEffect(() => {
    let cancelled = false;
    let saveTimeout: number | undefined;
    let savingEnabled = false;
    const resumeKey = `reading-progress-resume:${pathname}`;

    const saveProgress = () => {
      const root = document.querySelector<HTMLElement>(
        '[data-reading-content]',
      );
      const selector = root ? getTextQuoteSelector(root) : undefined;

      void fetch('/api/reading-progress', {
        body: JSON.stringify({ pathname, selector }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        method: 'POST',
      }).catch(() => undefined);
    };

    const scheduleSave = () => {
      if (saveTimeout) window.clearTimeout(saveTimeout);

      saveTimeout = window.setTimeout(saveProgress, 750);
    };

    const restoreProgress = async () => {
      const stored = sessionStorage.getItem(resumeKey);

      if (stored) {
        try {
          const value: unknown = JSON.parse(stored);

          if (
            typeof value === 'object' &&
            value !== null &&
            'selector' in value &&
            isTextQuoteSelector(value.selector)
          ) {
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => resolve());
            });

            if (cancelled) return;

            const root = document.querySelector<HTMLElement>(
              '[data-reading-content]',
            );

            if (root)
              restoreTextQuoteSelector({ root, selector: value.selector });
          }
        } catch {
          // Ignore an invalid local resume target.
        }

        sessionStorage.removeItem(resumeKey);
      }

      if (cancelled) return;

      savingEnabled = true;
      saveProgress();
      window.addEventListener('scroll', scheduleSave, { passive: true });
      window.addEventListener('visibilitychange', saveProgress);
    };

    void restoreProgress();

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', scheduleSave);
      window.removeEventListener('visibilitychange', saveProgress);
      if (saveTimeout) window.clearTimeout(saveTimeout);
      if (savingEnabled) saveProgress();
    };
  }, [pathname]);

  return null;
};
