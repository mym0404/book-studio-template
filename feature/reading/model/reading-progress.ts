import { docsRoute } from '@/feature/common/app';
import { getBookSlugForPathname } from '@/feature/library/books';
import { source } from '@/feature/library/source';
import type { TextQuoteSelector } from '@/feature/reading/model/text-quote-selector';

export type ReadingProgress = {
  bookSlug: string;
  pageTitle?: string;
  pageUrl: string;
  selector?: TextQuoteSelector;
};

export const getReadingProgressTarget = ({
  pathname,
  selector,
}: {
  pathname: string;
  selector?: TextQuoteSelector;
}): ReadingProgress | undefined => {
  const bookSlug = getBookSlugForPathname({ pathname });

  if (!bookSlug) return undefined;

  const page = source.getPage(
    pathname.slice(`${docsRoute}/`.length).split('/'),
  );

  if (
    !page ||
    page.url !== pathname ||
    page.url === `${docsRoute}/${bookSlug}`
  ) {
    return undefined;
  }

  return {
    bookSlug,
    pageUrl: page.url,
    selector,
  };
};
