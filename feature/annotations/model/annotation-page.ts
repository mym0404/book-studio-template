import { docsRoute } from '@/feature/common/app';
import { getBookSlugForPathname } from '@/feature/library/books';
import { source } from '@/feature/library/source';

export const getAnnotationPageUrl = ({ pathname }: { pathname: string }) => {
  const bookSlug = getBookSlugForPathname({ pathname });

  if (!bookSlug) return undefined;

  const page = source.getPage(
    pathname.slice(`${docsRoute}/`.length).split('/'),
  );

  if (!page || page.url !== pathname) return undefined;

  return page.url;
};
