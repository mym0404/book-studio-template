import { getBookSlugForPathname } from './reading-progress';
import { docsRoute, publicPageRoute } from './shared';
import { source } from './source';

export const PUBLIC_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

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
