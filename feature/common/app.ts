import { z } from 'zod';

export const appName = 'Book Studio';
export const appDescription = 'A private reading library built from your PDFs.';
export const docsRoute = '/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const publicPageRoute = '/public';
export const publicAssetRoute = '/public-assets';

const metadataUrlSchema = z.url();

export const getMetadataBase = () => {
  const configuredUrl =
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!configuredUrl) return new URL('http://localhost:3000');

  const normalizedUrl =
    configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')
      ? configuredUrl
      : `https://${configuredUrl}`;

  return new URL(metadataUrlSchema.parse(normalizedUrl));
};
