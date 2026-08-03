import { type Annotation, getAnnotationAnchorId } from '@/lib/annotation';
import { getTextQuoteRange } from '@/lib/text-quote-selector';

const HIGHLIGHT_CLASS =
  'cursor-pointer rounded-sm bg-yellow-300/60 text-inherit transition-colors hover:bg-yellow-300/80 dark:bg-yellow-400/30 dark:hover:bg-yellow-400/45';
const COMMENT_HIGHLIGHT_CLASS =
  'cursor-pointer rounded-sm bg-sky-200/65 text-inherit transition-colors hover:bg-sky-200/85 dark:bg-sky-300/25 dark:hover:bg-sky-300/40';
const READ_ONLY_HIGHLIGHT_CLASS =
  'rounded-sm bg-yellow-300/60 text-inherit dark:bg-yellow-400/30';
const READ_ONLY_COMMENT_HIGHLIGHT_CLASS =
  'cursor-pointer rounded-sm bg-sky-200/65 text-inherit transition-colors hover:bg-sky-200/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring dark:bg-sky-300/25 dark:hover:bg-sky-300/40';

export const unwrapRenderedAnnotations = (root: HTMLElement) => {
  const marks = Array.from(
    root.querySelectorAll<HTMLElement>('mark[data-annotation-id]'),
  );

  for (const mark of marks.reverse()) {
    const parent = mark.parentNode;

    if (!parent) continue;

    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);

    mark.remove();
  }

  root.normalize();
};

const renderAnnotation = ({
  annotation,
  readOnly,
  root,
}: {
  annotation: Annotation;
  readOnly: boolean;
  root: HTMLElement;
}) => {
  const range = getTextQuoteRange({ root, selector: annotation.selector });

  if (!range) return false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: { end: number; node: Text; start: number }[] = [];
  let node = walker.nextNode();

  while (node) {
    if (node instanceof Text && range.intersectsNode(node)) {
      const length = node.data.length;
      const start = node === range.startContainer ? range.startOffset : 0;
      const end = node === range.endContainer ? range.endOffset : length;

      if (start < end) segments.push({ end, node, start });
    }

    node = walker.nextNode();
  }

  if (segments.length === 0) return false;

  for (const [index, segment] of segments.reverse().entries()) {
    if (segment.end < segment.node.length) segment.node.splitText(segment.end);

    const selected =
      segment.start > 0 ? segment.node.splitText(segment.start) : segment.node;
    const mark = document.createElement('mark');

    if (readOnly) {
      mark.className = annotation.comment
        ? READ_ONLY_COMMENT_HIGHLIGHT_CLASS
        : READ_ONLY_HIGHLIGHT_CLASS;

      if (annotation.comment) {
        mark.ariaLabel = 'Read comment';
        mark.role = 'button';
        mark.tabIndex = 0;
      }
    } else {
      mark.className = annotation.comment
        ? COMMENT_HIGHLIGHT_CLASS
        : HIGHLIGHT_CLASS;
    }

    mark.dataset.annotationId = annotation.id;
    if (index === segments.length - 1) {
      mark.id = getAnnotationAnchorId({ id: annotation.id });
    }
    selected.replaceWith(mark);
    mark.append(selected);
  }

  return true;
};

export const renderAnnotations = ({
  annotations,
  readOnly = false,
  root,
}: {
  annotations: Annotation[];
  readOnly?: boolean;
  root: HTMLElement;
}) => {
  unwrapRenderedAnnotations(root);

  annotations.forEach((annotation) => {
    renderAnnotation({ annotation, readOnly, root });
  });
};
