'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import type { Annotation } from '@/feature/annotations/model/annotation';
import { READING_CONTENT_SELECTOR } from '@/feature/reading/model/reading-content';
import {
  getTextQuoteSelectorForRange,
  type TextQuoteSelection,
} from '@/feature/reading/model/text-quote-selector';

export type InputMode = 'desktop' | 'touch';

export type SelectionMenu = TextQuoteSelection & {
  contextElement: HTMLElement;
  inputMode: InputMode;
  range: Range;
};

export type AnnotationMenu = {
  id: string;
  inputMode: InputMode;
  reference: DOMRect;
};

const SELECTION_ACTION_RELEASE_DELAY_MS = 500;
const SELECTION_STABILIZE_DELAY_MS = 200;

export const getReadingSelectionRange = (root: HTMLElement) => {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return undefined;
  }

  const range = selection.getRangeAt(0);

  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  ) {
    return undefined;
  }

  return range;
};

export const useAnnotationSelection = ({
  annotations,
  commentInput,
  onInteractionOpen,
  pathname,
}: {
  annotations: Annotation[];
  commentInput: RefObject<HTMLTextAreaElement | null>;
  onInteractionOpen: () => void;
  pathname: string;
}) => {
  const [activeAnnotation, setActiveAnnotation] = useState<AnnotationMenu>();
  const [hasReadingSelection, setHasReadingSelection] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu>();
  const inputMode = useRef<InputMode | undefined>(undefined);
  const lastPathname = useRef(pathname);
  const selectionActionInProgress = useRef(false);
  const selectionActionListenerCleanup = useRef<(() => void) | undefined>(
    undefined,
  );
  const selectionActionReleaseTimer = useRef<number | undefined>(undefined);

  const clearSelectionActionListeners = () => {
    selectionActionListenerCleanup.current?.();
    selectionActionListenerCleanup.current = undefined;
  };

  const releaseSelectionAction = () => {
    clearSelectionActionListeners();
    selectionActionInProgress.current = false;
    selectionActionReleaseTimer.current = undefined;

    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

    if (root && getReadingSelectionRange(root)) return;

    setHasReadingSelection(false);
    setSelectionMenu(undefined);
  };

  const completeSelectionAction = () => {
    clearSelectionActionListeners();

    if (selectionActionReleaseTimer.current !== undefined) {
      window.clearTimeout(selectionActionReleaseTimer.current);
      selectionActionReleaseTimer.current = undefined;
    }

    selectionActionInProgress.current = false;
  };

  /**
   * Holds the native range through pointer-up so the button click can consume
   * it before selectionchange closes the annotation action menu.
   */
  const startSelectionAction = () => {
    clearSelectionActionListeners();

    if (selectionActionReleaseTimer.current !== undefined) {
      window.clearTimeout(selectionActionReleaseTimer.current);
      selectionActionReleaseTimer.current = undefined;
    }

    const scheduleRelease = () => {
      clearSelectionActionListeners();

      selectionActionReleaseTimer.current = window.setTimeout(
        releaseSelectionAction,
        SELECTION_ACTION_RELEASE_DELAY_MS,
      );
    };

    window.addEventListener('blur', scheduleRelease, { once: true });
    window.addEventListener('pointercancel', scheduleRelease, { once: true });
    window.addEventListener('pointerup', scheduleRelease, { once: true });
    selectionActionListenerCleanup.current = () => {
      window.removeEventListener('blur', scheduleRelease);
      window.removeEventListener('pointercancel', scheduleRelease);
      window.removeEventListener('pointerup', scheduleRelease);
    };
    selectionActionInProgress.current = true;
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setHasReadingSelection(false);
    setSelectionMenu(undefined);
  };

  useEffect(
    () => () => {
      if (selectionActionReleaseTimer.current !== undefined) {
        window.clearTimeout(selectionActionReleaseTimer.current);
      }

      selectionActionListenerCleanup.current?.();
    },
    [],
  );

  useEffect(() => {
    if (lastPathname.current === pathname) return;

    lastPathname.current = pathname;
    selectionActionInProgress.current = false;
    selectionActionListenerCleanup.current?.();
    selectionActionListenerCleanup.current = undefined;
    if (selectionActionReleaseTimer.current !== undefined) {
      window.clearTimeout(selectionActionReleaseTimer.current);
      selectionActionReleaseTimer.current = undefined;
    }

    setActiveAnnotation(undefined);
    setHasReadingSelection(false);
    setSelectionMenu(undefined);
  }, [pathname]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

    if (!root || window.location.pathname !== pathname) return;

    let selectionTimer: number | undefined;

    const getInputMode = (): InputMode =>
      inputMode.current ??
      (window.matchMedia('(any-pointer: coarse)').matches
        ? 'touch'
        : 'desktop');

    const closeSelection = () => {
      if (selectionActionInProgress.current) return;

      setHasReadingSelection(false);
      setSelectionMenu(undefined);
    };

    const captureSelection = () => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);

      if (!selectionActionInProgress.current) setSelectionMenu(undefined);

      const range = getReadingSelectionRange(root);

      if (!range) {
        selectionTimer = window.setTimeout(
          closeSelection,
          SELECTION_STABILIZE_DELAY_MS,
        );
        return;
      }

      setHasReadingSelection(true);

      selectionTimer = window.setTimeout(() => {
        const stableRange = getReadingSelectionRange(root);

        if (!stableRange) {
          closeSelection();
          return;
        }

        const textSelection = getTextQuoteSelectorForRange({
          range: stableRange,
          root,
        });

        if (!textSelection) {
          setSelectionMenu(undefined);
          return;
        }

        onInteractionOpen();
        setActiveAnnotation(undefined);
        setSelectionMenu({
          contextElement: root,
          inputMode: getInputMode(),
          range: stableRange.cloneRange(),
          ...textSelection,
        });
      }, SELECTION_STABILIZE_DELAY_MS);
    };

    const recordInputMode = (event: PointerEvent) => {
      inputMode.current = event.pointerType === 'touch' ? 'touch' : 'desktop';
    };

    const recordKeyboardInput = () => {
      inputMode.current = 'desktop';
    };

    const getAnnotationMark = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return undefined;

      const mark = target.closest<HTMLElement>('mark[data-annotation-id]');

      return mark && root.contains(mark) ? mark : undefined;
    };

    const openCommentOnHover = (event: PointerEvent) => {
      if (
        event.pointerType !== 'mouse' ||
        commentInput.current ||
        getReadingSelectionRange(root)
      ) {
        return;
      }

      const mark = getAnnotationMark(event.target);
      const annotation = annotations.find(
        ({ id }) => id === mark?.dataset.annotationId,
      );

      if (!mark || !annotation?.comment) return;

      setActiveAnnotation((current) =>
        current?.id === annotation.id
          ? current
          : {
              id: annotation.id,
              inputMode: 'desktop',
              reference: mark.getBoundingClientRect(),
            },
      );
    };

    const openAnnotation = (event: MouseEvent) => {
      const mark = getAnnotationMark(event.target);
      const selection = window.getSelection();

      if (!mark || !selection?.isCollapsed) return;

      const id = mark.dataset.annotationId;

      if (!id) return;

      event.stopPropagation();
      onInteractionOpen();
      setSelectionMenu(undefined);
      setActiveAnnotation({
        id,
        inputMode: getInputMode(),
        reference: mark.getBoundingClientRect(),
      });
    };

    document.addEventListener('selectionchange', captureSelection);
    document.addEventListener('keydown', recordKeyboardInput);
    root.addEventListener('click', openAnnotation);
    root.addEventListener('pointerdown', recordInputMode);
    root.addEventListener('pointerover', openCommentOnHover);

    return () => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer);

      document.removeEventListener('selectionchange', captureSelection);
      document.removeEventListener('keydown', recordKeyboardInput);
      root.removeEventListener('click', openAnnotation);
      root.removeEventListener('pointerdown', recordInputMode);
      root.removeEventListener('pointerover', openCommentOnHover);
    };
  }, [annotations, commentInput, onInteractionOpen, pathname]);

  return {
    activeAnnotation,
    clearSelection,
    completeSelectionAction,
    hasReadingSelection,
    selectionMenu,
    setActiveAnnotation,
    setSelectionMenu,
    startSelectionAction,
  };
};
