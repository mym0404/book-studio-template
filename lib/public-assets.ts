import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { publicAssetRoute } from './shared';

const BOOK_ASSET_ROUTE = '/books/';
const SIGNATURE_CONTEXT = 'book-studio-public-asset';

export const getPublicAssetContentDigest = ({ content }: { content: string }) =>
  createHash('sha256').update(content).digest('base64url');

const createPublicAssetSignature = ({
  assetSecret,
  assetPath,
  contentDigest,
  pageUrl,
}: {
  assetSecret: string;
  assetPath: string;
  contentDigest: string;
  pageUrl: string;
}) =>
  createHmac('sha256', assetSecret)
    .update(`${SIGNATURE_CONTEXT}\n${pageUrl}\n${contentDigest}\n${assetPath}`)
    .digest('base64url');

export const getPublicAssetUrl = ({
  assetSecret,
  contentDigest,
  pageUrl,
  sourceUrl,
}: {
  assetSecret: string;
  contentDigest: string;
  pageUrl: string;
  sourceUrl: string;
}) => {
  if (!sourceUrl.startsWith(BOOK_ASSET_ROUTE)) return sourceUrl;

  const assetPath = sourceUrl.slice(BOOK_ASSET_ROUTE.length);
  const signature = createPublicAssetSignature({
    assetSecret,
    assetPath,
    contentDigest,
    pageUrl,
  });
  const searchParams = new URLSearchParams({ page: pageUrl });

  return `${publicAssetRoute}/${signature}/${assetPath}?${searchParams}`;
};

export const hasValidPublicAssetSignature = ({
  assetSecret,
  contentDigest,
  pageUrl,
  path,
  signature,
}: {
  assetSecret: string;
  contentDigest: string;
  pageUrl: string;
  path: string[];
  signature: string;
}) => {
  const expected = Buffer.from(
    createPublicAssetSignature({
      assetSecret,
      assetPath: path.join('/'),
      contentDigest,
      pageUrl,
    }),
  );
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
