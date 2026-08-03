import { createHash } from 'node:crypto';
import type { Annotation } from '@/feature/annotations/model/annotation';
import { docsRoute } from '@/feature/common/app';
import { getBookPageUrls, source } from '@/feature/library/source';

export type SavedHighlightGroup = {
  annotations: Annotation[];
  pageUrl: string;
  title: string;
};

export const getPageTitle = ({ pageUrl }: { pageUrl: string }) => {
  const page = source.getPage(pageUrl.slice(`${docsRoute}/`.length).split('/'));

  return typeof page?.data.title === 'string' ? page.data.title : pageUrl;
};

export const getBookTitle = ({ bookSlug }: { bookSlug: string }) => {
  const page = source.getPage([bookSlug]);

  return typeof page?.data.title === 'string' ? page.data.title : undefined;
};

export const getSavedHighlightGroups = ({
  annotations,
  bookSlug,
}: {
  annotations: Annotation[];
  bookSlug: string;
}) => {
  const pageOrder = Object.fromEntries(
    getBookPageUrls({ bookSlug }).map((pageUrl, index) => [pageUrl, index]),
  );
  const orderedAnnotations = [...annotations].sort((left, right) => {
    const pageDifference =
      (pageOrder[left.pageUrl] ?? Number.MAX_SAFE_INTEGER) -
      (pageOrder[right.pageUrl] ?? Number.MAX_SAFE_INTEGER);

    if (pageDifference !== 0) return pageDifference;

    const positionDifference =
      (left.startOffset ?? Number.MAX_SAFE_INTEGER) -
      (right.startOffset ?? Number.MAX_SAFE_INTEGER);

    if (positionDifference !== 0) return positionDifference;

    return left.id.localeCompare(right.id);
  });

  return orderedAnnotations.reduce<SavedHighlightGroup[]>(
    (groups, annotation) => {
      const currentGroup = groups.at(-1);

      if (currentGroup?.pageUrl === annotation.pageUrl) {
        currentGroup.annotations.push(annotation);
        return groups;
      }

      groups.push({
        annotations: [annotation],
        pageUrl: annotation.pageUrl,
        title: getPageTitle({ pageUrl: annotation.pageUrl }),
      });
      return groups;
    },
    [],
  );
};

const formatQuote = ({ quote }: { quote: string }) =>
  quote
    .split('\n')
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join('\n');

const formatAnnotation = ({ annotation }: { annotation: Annotation }) => {
  const quote = formatQuote({ quote: annotation.selector.exact });

  return annotation.comment
    ? `${quote}\n\n**Note:** ${annotation.comment}`
    : quote;
};

export const getSavedHighlightsMarkdown = ({
  bookTitle,
  groups,
}: {
  bookTitle: string;
  groups: SavedHighlightGroup[];
}) => {
  const sections = groups.map(
    (group) =>
      `## ${group.title}\n\n${group.annotations
        .map((annotation) => formatAnnotation({ annotation }))
        .join('\n\n')}`,
  );

  return `${[`# Saved Highlights: ${bookTitle}`, ...sections].join('\n\n')}\n`;
};

export const getSavedHighlightsMarkdownVersion = ({
  markdown,
}: {
  markdown: string;
}) => createHash('sha256').update(markdown).digest('hex').slice(0, 16);
