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
import { cn } from 'cnfast';
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
  isAnnotationComment,
  MAX_ANNOTATION_COMMENT_LENGTH,
} from '@/feature/annotations/model/annotation';
import {
  renderAnnotations,
  unwrapRenderedAnnotations,
} from '@/feature/annotations/ui/annotation-highlights';
import {
  type AnnotationMenu,
  getReadingSelectionRange,
  type InputMode,
  useAnnotationSelection,
} from '@/feature/annotations/ui/use-annotation-selection';
import { usePageAnnotations } from '@/feature/annotations/ui/use-page-annotations';
import {
  READING_ANCHOR_TOP_PX,
  READING_CONTENT_SELECTOR,
} from '@/feature/reading/model/reading-content';
import type {
  TextQuoteSelection,
  TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';

type SelectionCommentEditor = TextQuoteSelection & {
  inputMode: InputMode;
  reference: DOMRect;
};

type CommentEditor = AnnotationMenu | SelectionCommentEditor;

const ACTION_BUTTON_CLASS =
  'rounded-md px-3 text-sm font-medium transition-colors active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-60';
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
      <Drawer.Viewport
        className={
          'fixed inset-x-0 top-0 bottom-(--drawer-keyboard-inset,0px) z-50 flex items-end justify-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'
        }
      >
        <Drawer.Popup
          className={cn(DRAWER_POPUP_CLASS, popupClassName)}
          finalFocus={false}
          initialFocus={initialFocus}
        >
          <Drawer.Title className={'sr-only'}>{title}</Drawer.Title>
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

export const PageAnnotations = ({ pathname }: { pathname: string }) => {
  const [commentDraft, setCommentDraft] = useState('');
  const [commentEditor, setCommentEditor] = useState<CommentEditor>();
  const commentInput = useRef<HTMLTextAreaElement | null>(null);
  const commentEditorPathname = useRef(pathname);
  const scrolledToAnnotation = useRef<string | undefined>(undefined);
  const {
    annotations,
    clearError,
    error,
    isSaving,
    removeAnnotation,
    saveAnnotation,
    updateComment,
  } = usePageAnnotations({ pathname });
  const resetInteraction = useCallback(() => {
    setCommentDraft('');
    setCommentEditor(undefined);
    clearError();
  }, [clearError]);
  const {
    activeAnnotation,
    clearSelection,
    completeSelectionAction,
    hasReadingSelection,
    selectionMenu,
    setActiveAnnotation,
    setSelectionMenu,
    startSelectionAction,
  } = useAnnotationSelection({
    annotations,
    commentInput,
    onInteractionOpen: resetInteraction,
    pathname,
  });
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
      clearError();
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

  useEffect(() => {
    if (commentEditorPathname.current === pathname) return;

    commentEditorPathname.current = pathname;
    setCommentEditor(undefined);
  }, [pathname]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

    if (!root || window.location.pathname !== pathname) return;

    return () => {
      unwrapRenderedAnnotations(root);
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);

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

    const root = document.querySelector<HTMLElement>(READING_CONTENT_SELECTOR);
    const target = document.getElementById(annotationId);

    if (!root || !target || !root.contains(target)) return;

    scrolledToAnnotation.current = annotationId;

    const { top } = target.getBoundingClientRect();
    window.scrollTo({
      top: Math.max(0, window.scrollY + top - READING_ANCHOR_TOP_PX),
    });
  }, [annotations]);

  const focusCommentInput = useCallback(
    (element: HTMLTextAreaElement | null) => {
      commentInput.current = element;
      element?.focus({ preventScroll: true });
    },
    [],
  );

  const closeCommentEditor = () => {
    setCommentDraft('');
    setCommentEditor(undefined);
    clearError();
  };

  const closeActiveAnnotation = () => {
    setActiveAnnotation(undefined);
    clearError();
  };

  const createAnnotation = ({
    comment,
    selector,
    startOffset,
  }: {
    comment?: string;
    selector: TextQuoteSelector;
    startOffset: number;
  }) => {
    clearSelection();
    setCommentEditor(undefined);
    setCommentDraft('');
    void saveAnnotation({ comment, selector, startOffset });
  };

  const saveComment = ({ comment, id }: { comment: string; id: string }) => {
    if (
      !isAnnotationComment(comment) ||
      !annotations.some((annotation) => annotation.id === id)
    ) {
      return;
    }

    setCommentEditor(undefined);
    setCommentDraft('');
    void updateComment({ comment, id });
  };

  const deleteAnnotation = (id: string) => {
    setActiveAnnotation(undefined);
    void removeAnnotation({ id });
  };

  const selectionMenuIsTouch = selectionMenu?.inputMode === 'touch';
  const commentEditorIsTouch = commentEditor?.inputMode === 'touch';
  const activeAnnotationIsTouch = activeAnnotation?.inputMode === 'touch';
  const commentEditorLabel =
    commentEditor && 'selector' in commentEditor
      ? 'Add comment'
      : 'Edit comment';
  const commentEditorBody = commentEditor ? (
    <>
      <textarea
        className={
          'min-h-24 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-fd-muted-foreground focus:ring-2 focus:ring-fd-ring'
        }
        data-base-ui-swipe-ignore
        maxLength={MAX_ANNOTATION_COMMENT_LENGTH}
        onChange={(event) => setCommentDraft(event.target.value)}
        placeholder={'Leave a comment'}
        ref={focusCommentInput}
        value={commentDraft}
      />
      {error && <p className={'mt-2 text-sm text-red-600'}>{error}</p>}
      <div className={'mt-3 flex justify-end gap-2'}>
        {commentEditorIsTouch ? (
          <Drawer.Close
            className={cn(ACTION_BUTTON_CLASS, 'min-h-11 hover:bg-fd-accent')}
            type={'button'}
          >
            Cancel
          </Drawer.Close>
        ) : (
          <button
            className={cn(ACTION_BUTTON_CLASS, 'py-2 hover:bg-fd-accent')}
            onClick={closeCommentEditor}
            type={'button'}
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
              createAnnotation({
                comment: commentDraft.trim(),
                selector: commentEditor.selector,
                startOffset: commentEditor.startOffset,
              });
              return;
            }

            saveComment({ comment: commentDraft, id: commentEditor.id });
          }}
          type={'button'}
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
          <p
            className={
              'max-w-[min(20rem,calc(100vw-1.5rem))] whitespace-pre-wrap break-words px-2 py-1.5 text-sm text-fd-muted-foreground'
            }
          >
            {selectedAnnotation.comment}
          </p>
        )}
        <div className={'flex justify-end'}>
          {activeAnnotationIsTouch && (
            <Drawer.Close
              className={cn(ACTION_BUTTON_CLASS, 'min-h-11 hover:bg-fd-accent')}
              type={'button'}
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
            type={'button'}
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
            onClick={() => deleteAnnotation(selectedAnnotation.id)}
            type={'button'}
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
          aria-label={'Annotation actions'}
          className={cn(
            selectionMenuIsTouch
              ? 'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
              : 'z-50',
          )}
          onPointerDownCapture={startSelectionAction}
          ref={selectionMenuIsTouch ? undefined : refs.setFloating}
          role={'toolbar'}
          {...(selectionMenuIsTouch
            ? {}
            : getFloatingProps({ style: floatingStyles }))}
        >
          <div className={'flex rounded-lg border bg-fd-popover p-1 shadow-lg'}>
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
                createAnnotation({
                  selector: selectionMenu.selector,
                  startOffset: selectionMenu.startOffset,
                });
              }}
              type={'button'}
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
                clearSelection();
              }}
              type={'button'}
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
          popupClassName={'max-h-[min(70dvh,32rem)] w-full max-w-lg p-3'}
          title={commentEditorLabel}
        >
          {commentEditorBody}
        </TouchDrawer>
      )}

      {commentEditor && !commentEditorIsTouch && (
        <div
          className={
            'z-50 w-[min(20rem,calc(100vw-1rem))] rounded-xl border bg-fd-popover p-3 shadow-xl'
          }
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
          popupClassName={
            'max-h-[min(60dvh,24rem)] w-fit max-w-[calc(100vw-1rem)] p-1'
          }
          title={'Annotation'}
        >
          {annotationActions}
        </TouchDrawer>
      )}

      {activeAnnotation && selectedAnnotation && !activeAnnotationIsTouch && (
        <div
          className={
            'z-50 w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border bg-fd-popover p-1 shadow-lg'
          }
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
        <p
          className={
            'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow-lg'
          }
        >
          {error}
        </p>
      )}
    </FloatingPortal>
  );
};
