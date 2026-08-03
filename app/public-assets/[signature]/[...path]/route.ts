import { getBookAssetResponse } from '@/lib/book-assets';
import {
  getPublicAssetContentDigest,
  hasValidPublicAssetSignature,
} from '@/lib/public-assets';
import { getShareablePage, PUBLIC_NO_STORE_HEADERS } from '@/lib/public-page';
import { getPublicPageAssetSecret } from '@/lib/public-pages';

export const dynamic = 'force-dynamic';

const notFound = () =>
  new Response(null, {
    headers: PUBLIC_NO_STORE_HEADERS,
    status: 404,
  });

export const GET = async (
  request: Request,
  { params }: RouteContext<'/public-assets/[signature]/[...path]'>,
) => {
  const pageUrl = new URL(request.url).searchParams.get('page');
  const { path, signature } = await params;
  const shareablePage = pageUrl ? getShareablePage({ pageUrl }) : undefined;

  if (!pageUrl || !shareablePage || path[0] !== shareablePage.bookSlug) {
    return notFound();
  }

  const processedContent = await shareablePage.page.data.getText('processed');
  const contentDigest = getPublicAssetContentDigest({
    content: processedContent,
  });
  const assetSecret = await getPublicPageAssetSecret({ pageUrl });

  if (
    !assetSecret ||
    !hasValidPublicAssetSignature({
      assetSecret,
      contentDigest,
      pageUrl,
      path,
      signature,
    })
  ) {
    return notFound();
  }

  return getBookAssetResponse({
    headers: PUBLIC_NO_STORE_HEADERS,
    path,
  });
};
