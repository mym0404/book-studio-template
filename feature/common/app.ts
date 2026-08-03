export const appName = 'Book Studio';
export const appDescription = 'A private reading library built from your PDFs.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const publicPageRoute = '/public';
export const publicAssetRoute = '/public-assets';

export const getMetadataBase = () => {
  const configuredUrl =
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!configuredUrl) return new URL('http://localhost:3000');

  return new URL(
    configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')
      ? configuredUrl
      : `https://${configuredUrl}`,
  );
};
