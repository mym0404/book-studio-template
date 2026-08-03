import { docsRoute, publicPageRoute } from '@/feature/common/app';
import { getBookSlugForPathname } from '@/feature/library/books';
import { source } from '@/feature/library/source';

export const PUBLIC_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

/**
 * Resolves only canonical book landing and chapter URLs; deeper or mismatched
 * documentation paths are not publishable.
 */
export const getShareablePage = ({ pageUrl }: { pageUrl: string }) => {
  if (!pageUrl.startsWith(`${docsRoute}/`)) return undefined;

  const slugs = pageUrl.slice(`${docsRoute}/`.length).split('/');
  const bookSlug = getBookSlugForPathname({ pathname: pageUrl });
  const page = source.getPage(slugs);

  if (
    !bookSlug ||
    !page ||
    page.url !== pageUrl ||
    page.slugs[0] !== bookSlug ||
    page.slugs.length > 2
  ) {
    return undefined;
  }

  return { bookSlug, page };
};

export const getPublicPageUrl = ({ pageUrl }: { pageUrl: string }) =>
  `${publicPageRoute}${pageUrl.slice(docsRoute.length)}`;
