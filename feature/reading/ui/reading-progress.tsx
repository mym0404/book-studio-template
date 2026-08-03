'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  isTextQuoteSelector,
  type TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';
import { ReadingProgressTracker } from '@/feature/reading/ui/reading-progress-tracker';

type SavedProgress = {
  pageTitle: string;
  pageUrl: string;
  selector: TextQuoteSelector;
};

const ACTIVE_BOOK_KEY = 'reading-progress-active-book';

const isSavedProgress = (value: unknown): value is SavedProgress =>
  typeof value === 'object' &&
  value !== null &&
  'pageUrl' in value &&
  typeof value.pageUrl === 'string' &&
  'pageTitle' in value &&
  typeof value.pageTitle === 'string' &&
  'selector' in value &&
  isTextQuoteSelector(value.selector);

/**
 * Requires a book context and withholds its tracker and children until the
 * first-entry resume decision has resolved.
 */
export const ReadingProgress = ({
  bookSlug,
  children,
  isBookChapter,
  pathname,
}: {
  bookSlug?: string;
  children?: ReactNode;
  isBookChapter: boolean;
  pathname: string;
}) => {
  const router = useRouter();
  const [progress, setProgress] = useState<SavedProgress>();
  const [resolvedPathname, setResolvedPathname] = useState<string>();
  const isEntryResolved = resolvedPathname === pathname;

  useEffect(() => {
    const controller = new AbortController();

    setProgress(undefined);

    if (!bookSlug) {
      sessionStorage.removeItem(ACTIVE_BOOK_KEY);
      setResolvedPathname(undefined);
      return () => controller.abort();
    }

    const isSameBook = sessionStorage.getItem(ACTIVE_BOOK_KEY) === bookSlug;
    sessionStorage.setItem(ACTIVE_BOOK_KEY, bookSlug);

    if (isSameBook) {
      setResolvedPathname(pathname);
      return () => controller.abort();
    }

    const loadProgress = async () => {
      try {
        const response = await fetch(
          `/api/reading-progress?bookSlug=${encodeURIComponent(bookSlug)}`,
          { credentials: 'same-origin', signal: controller.signal },
        );

        if (!response.ok || controller.signal.aborted) return;

        const value: unknown = await response.json();

        if (
          typeof value === 'object' &&
          value !== null &&
          'progress' in value &&
          isSavedProgress(value.progress)
        ) {
          setProgress(value.progress);
          return;
        }
      } catch {
        // Reading remains available when progress cannot be loaded.
      }

      if (!controller.signal.aborted) setResolvedPathname(pathname);
    };

    void loadProgress();

    return () => controller.abort();
  }, [bookSlug, pathname]);

  if (!bookSlug) return null;

  const stayHere = () => {
    setProgress(undefined);
    setResolvedPathname(pathname);
  };

  const resumeReading = () => {
    if (!progress) return;

    sessionStorage.setItem(
      `reading-progress-resume:${progress.pageUrl}`,
      JSON.stringify({ selector: progress.selector }),
    );
    setProgress(undefined);

    if (progress.pageUrl === pathname) {
      setResolvedPathname(pathname);
      return;
    }

    router.push(progress.pageUrl);
  };

  return (
    <>
      {isEntryResolved && (
        <>
          {isBookChapter && <ReadingProgressTracker pathname={pathname} />}
          {children}
        </>
      )}
      {progress && (
        <div
          aria-labelledby={'resume-reading-title'}
          aria-modal={'true'}
          className={
            'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
          }
          role={'dialog'}
        >
          <div
            className={
              'w-full max-w-sm rounded-xl border bg-fd-popover p-5 shadow-xl'
            }
          >
            <h2 className={'text-lg font-semibold'} id={'resume-reading-title'}>
              Resume reading?
            </h2>
            <p className={'mt-2 text-sm text-fd-muted-foreground'}>
              Last page:{' '}
              <span className={'font-medium text-fd-foreground'}>
                {progress.pageTitle}
              </span>
            </p>
            <div className={'mt-5 flex justify-end gap-2'}>
              <button
                className={
                  'rounded-md border px-3 py-2 text-sm font-medium hover:bg-fd-accent'
                }
                onClick={stayHere}
                type={'button'}
              >
                Stay here
              </button>
              <button
                className={
                  'rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90'
                }
                onClick={resumeReading}
                type={'button'}
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
