'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Annotation,
  annotationListResponseSchema,
  annotationResponseSchema,
} from '@/feature/annotations/model/annotation';
import type { TextQuoteSelector } from '@/feature/reading/model/text-quote-selector';

/**
 * Aborts the initial load before mutations, applies optimistic state, then
 * replaces it with the server result or restores the previous state.
 */
export const usePageAnnotations = ({ pathname }: { pathname: string }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const annotationsLoadController = useRef<AbortController | undefined>(
    undefined,
  );
  const clearError = useCallback(() => setError(undefined), []);

  const upsertAnnotation = (annotation: Annotation) => {
    setAnnotations((current) => {
      const index = current.findIndex(({ id }) => id === annotation.id);

      if (index === -1) return [...current, annotation];

      return current.map((item) =>
        item.id === annotation.id ? annotation : item,
      );
    });
  };

  const beginMutation = () => {
    annotationsLoadController.current?.abort();
    setError(undefined);
    setIsSaving(true);
  };

  const saveAnnotation = async ({
    comment,
    selector,
    startOffset,
  }: {
    comment?: string;
    selector: TextQuoteSelector;
    startOffset: number;
  }) => {
    const optimisticAnnotation: Annotation = {
      id: crypto.randomUUID(),
      pageUrl: pathname,
      selector,
      startOffset,
      ...(comment ? { comment: comment.trim() } : {}),
    };

    beginMutation();
    upsertAnnotation(optimisticAnnotation);

    try {
      const response = await fetch('/api/annotations', {
        body: JSON.stringify({
          comment,
          pageUrl: pathname,
          selector,
          startOffset,
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const value: unknown = response.ok ? await response.json() : undefined;
      const result = annotationResponseSchema.safeParse(value);

      if (!result.success) throw new Error('Could not save annotation.');

      setAnnotations((current) =>
        current.filter((item) => item.id !== optimisticAnnotation.id),
      );
      upsertAnnotation(result.data.annotation);
    } catch {
      setAnnotations((current) =>
        current.filter((item) => item.id !== optimisticAnnotation.id),
      );
      setError('Could not save annotation.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateComment = async ({
    comment,
    id,
  }: {
    comment: string;
    id: string;
  }) => {
    const annotation = annotations.find((item) => item.id === id);

    if (!annotation) return;

    const optimisticAnnotation = {
      ...annotation,
      comment: comment.trim(),
    };

    beginMutation();
    upsertAnnotation(optimisticAnnotation);

    try {
      const response = await fetch('/api/annotations', {
        body: JSON.stringify({ comment, id }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const value: unknown = response.ok ? await response.json() : undefined;
      const result = annotationResponseSchema.safeParse(value);

      if (!result.success) throw new Error('Could not update comment.');

      upsertAnnotation(result.data.annotation);
    } catch {
      upsertAnnotation(annotation);
      setError('Could not update comment.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeAnnotation = async ({ id }: { id: string }) => {
    const previousAnnotations = annotations;

    beginMutation();
    setAnnotations((current) => current.filter((item) => item.id !== id));

    try {
      const response = await fetch('/api/annotations', {
        body: JSON.stringify({ id }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Could not remove annotation.');
    } catch {
      setAnnotations(previousAnnotations);
      setError('Could not remove annotation.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    annotationsLoadController.current = controller;

    setAnnotations([]);

    const loadAnnotations = async () => {
      try {
        const response = await fetch(
          `/api/annotations?pageUrl=${encodeURIComponent(pathname)}`,
          { credentials: 'same-origin', signal: controller.signal },
        );

        if (!response.ok || controller.signal.aborted) return;

        const value: unknown = await response.json();
        const result = annotationListResponseSchema.safeParse(value);

        if (result.success) setAnnotations(result.data.annotations);
      } catch {
        // Reading remains available when annotations cannot be loaded.
      }
    };

    void loadAnnotations();

    return () => controller.abort();
  }, [pathname]);

  return {
    annotations,
    clearError,
    error,
    isSaving,
    removeAnnotation,
    saveAnnotation,
    updateComment,
  };
};
