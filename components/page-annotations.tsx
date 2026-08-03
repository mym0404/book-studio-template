'use client';

import { Drawer } from '@base-ui/react/drawer';
import {
  autoUpdate,
  FloatingPortal,
  flip,
  inline,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  type VirtualElement,
} from '@floating-ui/react';
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type Annotation,
  isAnnotation,
  isAnnotationComment,
  MAX_ANNOTATION_COMMENT_LENGTH,
} from '@/lib/annotation';
import { cn } from '@/lib/cn';
import {
  getTextQuoteSelectorForRange,
  type TextQuoteSelection,
  type TextQuoteSelector,
} from '@/lib/text-quote-selector';
import {
  renderAnnotations,
  unwrapRenderedAnnotations,
} from './annotation-highlights';

type InputMode = 'desktop' | 'touch';

type SelectionMenu = TextQuoteSelection & {
  contextElement: HTMLElement;
  inputMode: InputMode;
  range: Range;
};

type AnnotationMenu = {
  id: string;
  inputMode: InputMode;
  reference: DOMRect;
};

type SelectionCommentEditor = TextQuoteSelection & {
  inputMode: InputMode;
  reference: DOMRect;
};

type CommentEditor = AnnotationMenu | SelectionCommentEditor;

const ACTION_BUTTON_CLASS =
  'rounded-md px-3 text-sm font-medium transition-colors active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-60';
const SELECTION_ACTION_RELEASE_DELAY_MS = 500;
const SELECTION_STABILIZE_DELAY_MS = 200;
const DRAWER_BACKDROP_CLASS =
  'fixed inset-0 z-50 min-h-dvh bg-black/30 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none supports-[-webkit-touch-callout:none]:absolute';
const DRAWER_POPUP_CLASS =
  'relative overflow-y-auto overscroll-contain rounded-xl border bg-fd-popover outline-none shadow-xl touch-auto [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform data-swiping:select-none data-ending-style:[transform:translateY(calc(100%+1rem))] data-starting-style:[transform:translateY(calc(100%+1rem))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*220ms)] motion-reduce:transition-none';

const TouchDrawer = ({
  children,
  initialFocus,
  keyboardAware = false,
  onClose,
  popupClassName,
  title,
}: {
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  keyboardAware?: boolean;
  onClose: () => void;
  popupClassName: string;
  title: string;
}) => {
  const drawer = (
    <Drawer.Portal>
      <Drawer.Backdrop className={DRAWER_BACKDROP_CLASS} />
      <Drawer.Viewport className="fixed inset-x-0 top-0 bottom-(--drawer-keyboard-inset,0px) z-50 flex items-end justify-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Drawer.Popup
          className={cn(DRAWER_POPUP_CLASS, popupClassName)}
          finalFocus={false}
          initialFocus={initialFocus}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Content>{children}</Drawer.Content>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );

  return (
    <Drawer.Root
      defaultOpen
      onOpenChangeComplete={(open) => {
        if (!open) onClose();
      }}
    >
      {keyboardAware ? (
        <Drawer.VirtualKeyboardProvider>
          {drawer}
        </Drawer.VirtualKeyboardProvider>
      ) : (
        drawer
      )}
    </Drawer.Root>
  );
};

const isAnnotationList = (value: unknown): value is Annotation[] =>
  Array.isArray(value) && value.every(isAnnotation);

const getAnnotationResponse = (value: unknown) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'annotation' in value &&
    isAnnotation(value.annotation)
  ) {
    return value.annotation;
  }

  return undefined;
};

const clearSelection = () => window.getSelection()?.removeAllRanges();

const getReadingSelectionRange = (root: HTMLElement) => {
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

export const PageAnnotations = ({ pathname }: { pathname: string }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentEditor, setCommentEditor] = useState<CommentEditor>();
  const [error, setError] = useState<string>();
  const [activeAnnotation, setActiveAnnotation] = useState<AnnotationMenu>();
  const [hasReadingSelection, setHasReadingSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu>();
  const annotationsLoadController = useRef<AbortController | undefined>(
    undefined,
  );
  const inputMode = useRef<InputMode | undefined>(undefined);
  const commentInput = useRef<HTMLTextAreaElement | null>(null);
  const scrolledToAnnotation = useRef<string | undefined>(undefined);
  const selectionActionInProgress = useRef(false);
  const selectionActionListenerCleanup = useRef<(() => void) | undefined>(
    undefined,
  );
  const selectionActionReleaseTimer = useRef<number | undefined>(undefined);

  const selectedAnnotation = activeAnnotation
    ? annotations.find(({ id }) => id === activeAnnotation.id)
    : undefined;
  const floatingSelectionMenu =
    selectionMenu?.inputMode === 'desktop' ? selectionMenu : undefined;
  const floatingCommentEditor =
    commentEditor?.inputMode === 'desktop' ? commentEditor : undefined;
  const floatingAnnotation =
    activeAnnotation?.inputMode === 'desktop' ? activeAnnotation : undefined;
  const floatingOpen = Boolean(
    floatingSelectionMenu || floatingCommentEditor || floatingAnnotation,
  );
  const floatingReference =
    floatingSelectionMenu ?? floatingCommentEditor ?? floatingAnnotation;
  const virtualReference = useMemo<VirtualElement | undefined>(() => {
    if (!floatingReference) return undefined;

    if ('range' in floatingReference) {
      return {
        contextElement: floatingReference.contextElement,
        getBoundingClientRect: () =>
          floatingReference.range.getBoundingClientRect(),
        getClientRects: () =>
          Array.from(floatingReference.range.getClientRects()),
      };
    }

    return {
      getBoundingClientRect: () => floatingReference.reference,
    };
  }, [floatingReference]);
  const { context, floatingStyles, refs } = useFloating({
    middleware: [inline(), offset(8), flip(), shift({ padding: 8 })],
    onOpenChange: (open) => {
      if (open) return;

      setActiveAnnotation(undefined);
      setCommentDraft('');
      setCommentEditor(undefined);
      setError(undefined);
      setSelectionMenu(undefined);
    },
    open: floatingOpen,
    placement: floatingSelectionMenu ? 'top' : 'bottom-start',
    strategy: 'absolute',
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, {
        ancestorScroll: Boolean(floatingSelectionMenu),
      }),
  });
  const dismiss = useDismiss(context, {
    outsidePress: !floatingSelectionMenu,
    outsidePressEvent: 'click',
  });
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    refs.setPositionReference(virtualReference ?? null);
  }, [refs, virtualReference]);

  useEffect(
    () => () => {
      if (selectionActionReleaseTimer.current !== undefined) {
        window.clearTimeout(selectionActionReleaseTimer.current);
      }

      selectionActionListenerCleanup.current?.();
    },
    [],
  );

  const focusCommentInput = useCallback(
    (element: HTMLTextAreaElement | null) => {
      commentInput.current = element;
      element?.focus({ preventScroll: true });
    },
    [],
  );

  const upsertAnnotation = (annotation: Annotation) => {
    setAnnotations((current) => {
      const index = current.findIndex(({ id }) => id === annotation.id);

      if (index === -1) return [...current, annotation];

      return current.map((item) =>
        item.id === annotation.id ? annotation : item,
      );
    });
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

    annotationsLoadController.current?.abort();
    setError(undefined);
    setIsSaving(true);
    clearSelection();
    setHasReadingSelection(false);
    setSelectionMenu(undefined);
    setCommentEditor(undefined);
    setCommentDraft('');

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
      const annotation = getAnnotationResponse(value);

      if (!annotation) throw new Error('Could not save annotation.');

      setAnnotations((current) =>
        current.filter((item) => item.id !== optimisticAnnotation.id),
      );
      upsertAnnotation(annotation);
    } catch {
      setAnnotations((current) =>
        current.filter((item) => item.id !== optimisticAnnotation.id),
      );
      setError('Could not save annotation.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateComment = async (id: string) => {
    if (!isAnnotationComment(commentDraft)) return;

    const annotation = annotations.find((item) => item.id === id);

    if (!annotation) return;

    const optimisticAnnotation = {
      ...annotation,
      comment: commentDraft.trim(),
    };

    annotationsLoadController.current?.abort();
    setError(undefined);
    setIsSaving(true);
    setCommentEditor(undefined);
    setCommentDraft('');

    upsertAnnotation(optimisticAnnotation);

    try {
      const response = await fetch('/api/annotations', {
        body: JSON.stringify({
          comment: commentDraft,
          id,
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const value: unknown = response.ok ? await response.json() : undefined;
      const updatedAnnotation = getAnnotationResponse(value);

      if (!updatedAnnotation) throw new Error('Could not update comment.');

      upsertAnnotation(updatedAnnotation);
    } catch {
      upsertAnnotation(annotation);
      setError('Could not update comment.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeAnnotation = async (id: string) => {
    const previousAnnotations = annotations;

    annotationsLoadController.current?.abort();
    setError(undefined);
    setIsSaving(true);
    setActiveAnnotation(undefined);
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

    selectionActionInProgress.current = false;
    selectionActionListenerCleanup.current?.();
    selectionActionListenerCleanup.current = undefined;
    if (selectionActionReleaseTimer.current !== undefined) {
      window.clearTimeout(selectionActionReleaseTimer.current);
      selectionActionReleaseTimer.current = undefined;
    }

    setAnnotations([]);
    setActiveAnnotation(undefined);
    setCommentEditor(undefined);
    setHasReadingSelection(false);
    setSelectionMenu(undefined);

    const loadAnnotations = async () => {
      try {
        const response = await fetch(
          `/api/annotations?pageUrl=${encodeURIComponent(pathname)}`,
          { credentials: 'same-origin', signal: controller.signal },
        );

        if (!response.ok || controller.signal.aborted) return;

        const value: unknown = await response.json();

        if (
          typeof value === 'object' &&
          value !== null &&
          'annotations' in value &&
          isAnnotationList(value.annotations)
        ) {
          setAnnotations(value.annotations);
        }
      } catch {
        // Reading remains available when annotations cannot be loaded.
      }
    };

    void loadAnnotations();

    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-reading-content]');

    if (!root || window.location.pathname !== pathname) return;

    return () => {
      unwrapRenderedAnnotations(root);
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-reading-content]');

    if (
      !root ||
      window.location.pathname !== pathname ||
      hasReadingSelection ||
      getReadingSelectionRange(root)
    ) {
      return;
    }

    renderAnnotations({ annotations, root });
  }, [annotations, hasReadingSelection, pathname]);

  useEffect(() => {
    const annotationId = window.location.hash.slice(1);

    if (
      annotations.length === 0 ||
      !annotationId ||
      scrolledToAnnotation.current === annotationId
    ) {
      return;
    }

    const root = document.querySelector<HTMLElement>('[data-reading-content]');
    const target = document.getElementById(annotationId);

    if (!root || !target || !root.contains(target)) return;

    scrolledToAnnotation.current = annotationId;

    const { top } = target.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + top - 96) });
  }, [annotations]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-reading-content]');

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

        setActiveAnnotation(undefined);
        setCommentEditor(undefined);
        setError(undefined);
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
      setCommentDraft('');
      setCommentEditor(undefined);
      setError(undefined);
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
  }, [annotations, pathname]);

  const selectionMenuIsTouch = selectionMenu?.inputMode === 'touch';
  const commentEditorIsTouch = commentEditor?.inputMode === 'touch';
  const activeAnnotationIsTouch = activeAnnotation?.inputMode === 'touch';

  const closeCommentEditor = () => {
    setCommentDraft('');
    setCommentEditor(undefined);
    setError(undefined);
  };

  const closeActiveAnnotation = () => {
    setActiveAnnotation(undefined);
    setError(undefined);
  };

  const clearSelectionActionListeners = () => {
    selectionActionListenerCleanup.current?.();
    selectionActionListenerCleanup.current = undefined;
  };

  const releaseSelectionAction = () => {
    clearSelectionActionListeners();
    selectionActionInProgress.current = false;
    selectionActionReleaseTimer.current = undefined;

    const root = document.querySelector<HTMLElement>('[data-reading-content]');

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

  const commentEditorLabel =
    commentEditor && 'selector' in commentEditor
      ? 'Add comment'
      : 'Edit comment';
  const commentEditorBody = commentEditor ? (
    <>
      <textarea
        className="min-h-24 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-fd-muted-foreground focus:ring-2 focus:ring-fd-ring"
        data-base-ui-swipe-ignore
        maxLength={MAX_ANNOTATION_COMMENT_LENGTH}
        onChange={(event) => setCommentDraft(event.target.value)}
        placeholder="Leave a comment"
        ref={focusCommentInput}
        value={commentDraft}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        {commentEditorIsTouch ? (
          <Drawer.Close
            className={cn(ACTION_BUTTON_CLASS, 'min-h-11 hover:bg-fd-accent')}
            type="button"
          >
            Cancel
          </Drawer.Close>
        ) : (
          <button
            className={cn(ACTION_BUTTON_CLASS, 'py-2 hover:bg-fd-accent')}
            onClick={closeCommentEditor}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className={cn(
            ACTION_BUTTON_CLASS,
            'bg-fd-primary text-fd-primary-foreground',
            commentEditorIsTouch ? 'min-h-11' : 'py-2',
          )}
          disabled={!isAnnotationComment(commentDraft) || isSaving}
          onClick={() => {
            if ('selector' in commentEditor) {
              void saveAnnotation({
                comment: commentDraft.trim(),
                selector: commentEditor.selector,
                startOffset: commentEditor.startOffset,
              });
              return;
            }

            void updateComment(commentEditor.id);
          }}
          type="button"
        >
          Save
        </button>
      </div>
    </>
  ) : undefined;
  const annotationActions =
    activeAnnotation && selectedAnnotation ? (
      <>
        {selectedAnnotation.comment && (
          <p className="max-w-[min(20rem,calc(100vw-1.5rem))] whitespace-pre-wrap break-words px-2 py-1.5 text-sm text-fd-muted-foreground">
            {selectedAnnotation.comment}
          </p>
        )}
        <div className="flex justify-end">
          {activeAnnotationIsTouch && (
            <Drawer.Close
              className={cn(ACTION_BUTTON_CLASS, 'min-h-11 hover:bg-fd-accent')}
              type="button"
            >
              Close
            </Drawer.Close>
          )}
          <button
            className={cn(
              ACTION_BUTTON_CLASS,
              'hover:bg-fd-accent',
              activeAnnotationIsTouch ? 'min-h-11' : 'py-1.5',
            )}
            disabled={isSaving}
            onClick={() => {
              setCommentDraft(selectedAnnotation.comment ?? '');
              setCommentEditor(activeAnnotation);
              setActiveAnnotation(undefined);
            }}
            type="button"
          >
            {selectedAnnotation.comment ? 'Edit comment' : 'Add comment'}
          </button>
          <button
            className={cn(
              ACTION_BUTTON_CLASS,
              'text-red-600 hover:bg-red-500/10',
              activeAnnotationIsTouch ? 'min-h-11 min-w-11' : 'py-1.5',
            )}
            disabled={isSaving}
            onClick={() => void removeAnnotation(selectedAnnotation.id)}
            type="button"
          >
            Remove
          </button>
        </div>
      </>
    ) : undefined;

  return (
    <FloatingPortal>
      {selectionMenu && (
        <div
          aria-label="Annotation actions"
          className={cn(
            selectionMenuIsTouch
              ? 'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
              : 'z-50',
          )}
          onPointerDownCapture={startSelectionAction}
          ref={selectionMenuIsTouch ? undefined : refs.setFloating}
          role="toolbar"
          {...(selectionMenuIsTouch
            ? {}
            : getFloatingProps({ style: floatingStyles }))}
        >
          <div className="flex rounded-lg border bg-fd-popover p-1 shadow-lg">
            <button
              className={cn(
                ACTION_BUTTON_CLASS,
                'hover:bg-fd-accent',
                selectionMenuIsTouch
                  ? 'pointer-events-auto min-h-11 min-w-11'
                  : 'py-1.5',
              )}
              disabled={isSaving}
              onClick={() => {
                completeSelectionAction();
                void saveAnnotation({
                  selector: selectionMenu.selector,
                  startOffset: selectionMenu.startOffset,
                });
              }}
              type="button"
            >
              Highlight
            </button>
            <button
              className={cn(
                ACTION_BUTTON_CLASS,
                'hover:bg-fd-accent',
                selectionMenuIsTouch
                  ? 'pointer-events-auto min-h-11 min-w-11'
                  : 'py-1.5',
              )}
              disabled={isSaving}
              onClick={() => {
                completeSelectionAction();
                setCommentDraft('');
                setCommentEditor({
                  inputMode: selectionMenu.inputMode,
                  reference: selectionMenu.range.getBoundingClientRect(),
                  selector: selectionMenu.selector,
                  startOffset: selectionMenu.startOffset,
                });
                setSelectionMenu(undefined);
                clearSelection();
                setHasReadingSelection(false);
              }}
              type="button"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {commentEditor && commentEditorIsTouch && (
        <TouchDrawer
          initialFocus={commentInput}
          keyboardAware
          onClose={closeCommentEditor}
          popupClassName="max-h-[min(70dvh,32rem)] w-full max-w-lg p-3"
          title={commentEditorLabel}
        >
          {commentEditorBody}
        </TouchDrawer>
      )}

      {commentEditor && !commentEditorIsTouch && (
        <div
          className="z-50 w-[min(20rem,calc(100vw-1rem))] rounded-xl border bg-fd-popover p-3 shadow-xl"
          ref={refs.setFloating}
          {...getFloatingProps({
            'aria-label': commentEditorLabel,
            role: 'dialog',
            style: floatingStyles,
          })}
        >
          {commentEditorBody}
        </div>
      )}

      {activeAnnotation && selectedAnnotation && activeAnnotationIsTouch && (
        <TouchDrawer
          onClose={closeActiveAnnotation}
          popupClassName="max-h-[min(60dvh,24rem)] w-fit max-w-[calc(100vw-1rem)] p-1"
          title="Annotation"
        >
          {annotationActions}
        </TouchDrawer>
      )}

      {activeAnnotation && selectedAnnotation && !activeAnnotationIsTouch && (
        <div
          className="z-50 w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border bg-fd-popover p-1 shadow-lg"
          ref={refs.setFloating}
          {...getFloatingProps({
            'aria-label': 'Annotation',
            role: 'menu',
            style: floatingStyles,
          })}
        >
          {annotationActions}
        </div>
      )}

      {error && !activeAnnotation && !commentEditor && (
        <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow-lg">
          {error}
        </p>
      )}
    </FloatingPortal>
  );
};
