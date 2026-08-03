import { getLayoutTabs } from 'fumadocs-ui/layouts/shared';
import { docsRoute } from '@/feature/common/app';
import { source } from '@/feature/library/source';

const getBookUrls = () =>
  getLayoutTabs(source.getPageTree()).map(({ url }) => url);

export const getBookSlugForPathname = ({ pathname }: { pathname: string }) => {
  const bookUrl = getBookUrls().find(
    (url) => pathname === url || pathname.startsWith(`${url}/`),
  );

  if (!bookUrl) return undefined;

  return bookUrl.slice(`${docsRoute}/`.length);
};

export const isBookSlug = (bookSlug: string) =>
  getBookUrls().includes(`${docsRoute}/${bookSlug}`);
