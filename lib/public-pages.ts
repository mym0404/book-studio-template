import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from './database';
import { docsRoute } from './shared';

export const getPublishedPageUrlsForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const bookUrl = `${docsRoute}/${bookSlug}`;
  const rows = await sql`
    SELECT page_url
    FROM public_pages
    WHERE page_url = ${bookUrl}
      OR page_url LIKE ${`${bookUrl}/%`}
  `;

  return rows.flatMap((row) =>
    typeof row.page_url === 'string' ? [row.page_url] : [],
  );
};

export const isPagePublic = async ({ pageUrl }: { pageUrl: string }) => {
  return (await getPublicPageAssetSecret({ pageUrl })) !== undefined;
};

export const getPublicPageAssetSecret = async ({
  pageUrl,
}: {
  pageUrl: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    SELECT asset_secret
    FROM public_pages
    WHERE page_url = ${pageUrl}
  `;

  if (
    typeof row !== 'object' ||
    row === null ||
    !('asset_secret' in row) ||
    typeof row.asset_secret !== 'string'
  ) {
    return undefined;
  }

  return row.asset_secret;
};

export const publishPage = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = neon(getDatabaseUrl());

  await sql`
    INSERT INTO public_pages (page_url)
    VALUES (${pageUrl})
    ON CONFLICT (page_url) DO NOTHING
  `;
};

export const unpublishPage = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = neon(getDatabaseUrl());

  await sql`
    DELETE FROM public_pages
    WHERE page_url = ${pageUrl}
  `;
};
