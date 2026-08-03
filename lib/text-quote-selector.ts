export type TextQuoteSelector = {
  exact: string;
  prefix: string;
  suffix: string;
};

export type TextQuoteSelection = {
  selector: TextQuoteSelector;
  startOffset: number;
};

const CONTEXT_LENGTH = 48;
const READING_EXACT_LENGTH = 160;
export const ANNOTATION_EXACT_LENGTH = 300;
const READING_BLOCK_SELECTOR = 'h2, h3, h4, p, li, blockquote, pre';

const isTextQuoteSelectorWithExactLength = (
  value: unknown,
  exactLength: number,
): value is TextQuoteSelector =>
  typeof value === 'object' &&
  value !== null &&
  'exact' in value &&
  typeof value.exact === 'string' &&
  value.exact.length > 0 &&
  value.exact.length <= exactLength &&
  'prefix' in value &&
  typeof value.prefix === 'string' &&
  value.prefix.length <= CONTEXT_LENGTH &&
  'suffix' in value &&
  typeof value.suffix === 'string' &&
  value.suffix.length <= CONTEXT_LENGTH;

export const isTextQuoteSelector = (
  value: unknown,
): value is TextQuoteSelector =>
  isTextQuoteSelectorWithExactLength(value, READING_EXACT_LENGTH);

export const isAnnotationTextQuoteSelector = (
  value: unknown,
): value is TextQuoteSelector =>
  isTextQuoteSelectorWithExactLength(value, ANNOTATION_EXACT_LENGTH);

const getVisibleReadingBlock = (root: HTMLElement) => {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>(READING_BLOCK_SELECTOR),
  ).filter((element) => element.textContent?.trim());

  return (
    blocks.find((element) => {
      const { bottom, top } = element.getBoundingClientRect();

      return bottom > 96 && top < window.innerHeight;
    }) ?? blocks[0]
  );
};

const getTextOffset = ({
  node,
  offset,
  root,
}: {
  node: Node;
  offset: number;
  root: HTMLElement;
}) => {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);

  return range.toString().length;
};

const getReadingOffset = (root: HTMLElement) => {
  const block = getVisibleReadingBlock(root);

  if (!block) return undefined;

  const { left, top } = block.getBoundingClientRect();
  const caretRange = document.caretRangeFromPoint?.(
    left + 8,
    Math.max(top + 8, 96),
  );

  if (caretRange && root.contains(caretRange.startContainer)) {
    return getTextOffset({
      node: caretRange.startContainer,
      offset: caretRange.startOffset,
      root,
    });
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEndBefore(block);

  return range.toString().length;
};

export const getTextQuoteSelector = (root: HTMLElement) => {
  const text = root.textContent;
  const readingOffset = getReadingOffset(root);

  if (!text || readingOffset === undefined) return undefined;

  const exactStart = text.slice(readingOffset).search(/\S/);

  if (exactStart === -1) return undefined;

  const start = readingOffset + exactStart;
  const exact = text.slice(start, start + READING_EXACT_LENGTH);

  if (!exact) return undefined;

  return {
    exact,
    prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: text.slice(
      start + exact.length,
      start + exact.length + CONTEXT_LENGTH,
    ),
  };
};

export const getTextQuoteSelectorForRange = ({
  range,
  root,
}: {
  range: Range;
  root: HTMLElement;
}) => {
  if (
    range.collapsed ||
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  ) {
    return undefined;
  }

  const text = root.textContent;

  if (!text) return undefined;

  const startOffset = getTextOffset({
    node: range.startContainer,
    offset: range.startOffset,
    root,
  });
  const endOffset = getTextOffset({
    node: range.endContainer,
    offset: range.endOffset,
    root,
  });
  const selected = text.slice(startOffset, endOffset);
  const firstCharacter = selected.search(/\S/);

  if (firstCharacter === -1) return undefined;

  const lastCharacter = selected.length - selected.trimEnd().length;
  const start = startOffset + firstCharacter;
  const end = endOffset - lastCharacter;
  const exact = text.slice(start, end);

  if (
    !isAnnotationTextQuoteSelector({
      exact,
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
    })
  ) {
    return undefined;
  }

  return {
    selector: {
      exact,
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
    },
    startOffset: start,
  };
};

const findTextQuoteOffset = ({
  selector,
  text,
}: {
  selector: TextQuoteSelector;
  text: string;
}) => {
  let fallback: number | undefined;
  let offset = text.indexOf(selector.exact);

  while (offset !== -1) {
    fallback ??= offset;

    const prefix = text.slice(
      Math.max(0, offset - selector.prefix.length),
      offset,
    );
    const suffix = text.slice(
      offset + selector.exact.length,
      offset + selector.exact.length + selector.suffix.length,
    );

    if (prefix === selector.prefix && suffix === selector.suffix) return offset;

    offset = text.indexOf(selector.exact, offset + selector.exact.length);
  }

  return fallback;
};

const getTextPosition = ({
  offset,
  root,
}: {
  offset: number;
  root: HTMLElement;
}) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length ?? 0;

    if (offset <= textOffset + length) {
      return { node, offset: offset - textOffset };
    }

    textOffset += length;
    node = walker.nextNode();
  }

  return undefined;
};

export const getTextQuoteRange = ({
  root,
  selector,
}: {
  root: HTMLElement;
  selector: TextQuoteSelector;
}) => {
  const text = root.textContent;

  if (!text) return undefined;

  const startOffset = findTextQuoteOffset({ selector, text });

  if (startOffset === undefined) return undefined;

  const start = getTextPosition({ offset: startOffset, root });
  const end = getTextPosition({
    offset: startOffset + selector.exact.length,
    root,
  });

  if (!start || !end) return undefined;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  return range;
};

export const restoreTextQuoteSelector = ({
  root,
  selector,
}: {
  root: HTMLElement;
  selector: TextQuoteSelector;
}) => {
  const range = getTextQuoteRange({ root, selector });

  if (!range) return false;

  const { top } = range.getBoundingClientRect();
  window.scrollTo({ top: Math.max(0, window.scrollY + top - 96) });

  return true;
};
