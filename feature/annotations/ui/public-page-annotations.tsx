'use client';

import { useEffect, useState } from 'react';
import type { Annotation } from '@/feature/annotations/model/annotation';
import {
  renderAnnotations,
  unwrapRenderedAnnotations,
} from '@/feature/annotations/ui/annotation-highlights';
import { READING_CONTENT_SELECTOR } from '@/feature/reading/model/reading-content';

export const PublicPageAnnotations = ({
  annotations,
}: {
  annotations: Annotation[];
}) => {
  const [activeAnnotationId, setActiveAnnotationId] = useState<string>();
  const activeAnnotation = annotations.find(
    ({ id }) => id === activeAnnotationId,
  );

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

    if (!root) return;

    renderAnnotations({ annotations, readOnly: true, root });

    return () => {
      unwrapRenderedAnnotations(root);
    };
  }, [annotations]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

    if (!root) return;

    const openComment = (target: EventTarget | null | undefined) => {
      if (!(target instanceof Element)) return;

      const mark = target.closest<HTMLElement>('mark[data-annotation-id]');
      const annotation = annotations.find(
        ({ id }) => id === mark?.dataset.annotationId,
      );

      if (!mark || !root.contains(mark) || !annotation?.comment) return;

      setActiveAnnotationId(annotation.id);
    };

    const handleClick = (event: MouseEvent) => {
      openComment(event.target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const mark =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('mark[data-annotation-id]')
          : undefined;

      if (!mark) return;

      event.preventDefault();
      openComment(mark);
    };

    root.addEventListener('click', handleClick);
    root.addEventListener('keydown', handleKeyDown);

    return () => {
      root.removeEventListener('click', handleClick);
      root.removeEventListener('keydown', handleKeyDown);
    };
  }, [annotations]);

  useEffect(() => {
    if (!activeAnnotation) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveAnnotationId(undefined);
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activeAnnotation]);

  if (!activeAnnotation?.comment) return null;

  return (
    <div
      aria-labelledby={'public-annotation-title'}
      aria-modal={'true'}
      className={
        'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
      }
      role={'dialog'}
    >
      <div
        className={
          'w-full max-w-md rounded-xl border bg-fd-popover p-5 shadow-xl'
        }
      >
        <h2
          className={'text-base font-semibold'}
          id={'public-annotation-title'}
        >
          Comment
        </h2>
        <p
          className={
            'mt-3 whitespace-pre-wrap break-words text-sm text-fd-muted-foreground'
          }
        >
          {activeAnnotation.comment}
        </p>
        <div className={'mt-5 flex justify-end'}>
          <button
            className={
              'rounded-md border px-3 py-2 text-sm font-medium hover:bg-fd-accent'
            }
            onClick={() => setActiveAnnotationId(undefined)}
            type={'button'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
