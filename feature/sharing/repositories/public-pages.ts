import { z } from 'zod';
import { docsRoute } from '@/feature/common/app';
import { getDatabase } from '@/feature/common/database';

const publishedPageRowSchema = z.object({ page_url: z.string() });
const publicPageAssetRowSchema = z.object({ asset_secret: z.string() });

export const getPublishedPageUrlsForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}) => {
  const sql = getDatabase();
  const bookUrl = `${docsRoute}/${bookSlug}`;
  const rows = await sql`
    SELECT page_url
    FROM public_pages
    WHERE page_url = ${bookUrl}
      OR page_url LIKE ${`${bookUrl}/%`}
  `;

  return rows.flatMap((row) => {
    const result = publishedPageRowSchema.safeParse(row);

    return result.success ? [result.data.page_url] : [];
  });
};

export const isPagePublic = async ({ pageUrl }: { pageUrl: string }) => {
  return (await getPublicPageAssetSecret({ pageUrl })) !== undefined;
};

/**
 * The public_pages row is the publication gate; a missing or malformed secret
 * keeps both the page and its assets private.
 */
export const getPublicPageAssetSecret = async ({
  pageUrl,
}: {
  pageUrl: string;
}) => {
  const sql = getDatabase();
  const [row] = await sql`
    SELECT asset_secret
    FROM public_pages
    WHERE page_url = ${pageUrl}
  `;

  const result = publicPageAssetRowSchema.safeParse(row);

  return result.success ? result.data.asset_secret : undefined;
};

export const publishPage = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = getDatabase();

  await sql`
    INSERT INTO public_pages (page_url)
    VALUES (${pageUrl})
    ON CONFLICT (page_url) DO NOTHING
  `;
};

export const unpublishPage = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = getDatabase();

  await sql`
    DELETE FROM public_pages
    WHERE page_url = ${pageUrl}
  `;
};
