import { neon } from '@neondatabase/serverless';
import { docsRoute } from '@/feature/common/app';
import { getDatabaseUrl } from '@/feature/common/database';
import { source } from '@/feature/library/source';
import type { ReadingProgress } from '@/feature/reading/model/reading-progress';
import {
  isTextQuoteSelector,
  type TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';

type ReadingProgressRow = {
  book_slug: string;
  page_url: string;
  prefix: string | null;
  quote: string | null;
  suffix: string | null;
};

const isReadingProgressRow = (value: unknown): value is ReadingProgressRow =>
  typeof value === 'object' &&
  value !== null &&
  'book_slug' in value &&
  typeof value.book_slug === 'string' &&
  'page_url' in value &&
  typeof value.page_url === 'string' &&
  'quote' in value &&
  (typeof value.quote === 'string' || value.quote === null) &&
  'prefix' in value &&
  (typeof value.prefix === 'string' || value.prefix === null) &&
  'suffix' in value &&
  (typeof value.suffix === 'string' || value.suffix === null);

export const getReadingProgressForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}): Promise<ReadingProgress | undefined> => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    SELECT book_slug, page_url, quote, prefix, suffix
    FROM reading_progress
    WHERE book_slug = ${bookSlug}
  `;

  if (!isReadingProgressRow(row)) return undefined;

  const selector: TextQuoteSelector = {
    exact: row.quote ?? '',
    prefix: row.prefix ?? '',
    suffix: row.suffix ?? '',
  };

  if (!isTextQuoteSelector(selector)) return undefined;

  const page = source.getPage(
    row.page_url.slice(`${docsRoute}/`.length).split('/'),
  );

  return {
    bookSlug: row.book_slug,
    pageTitle:
      typeof page?.data.title === 'string' ? page.data.title : row.page_url,
    pageUrl: row.page_url,
    selector,
  };
};

export const saveReadingProgress = async ({
  bookSlug,
  pageUrl,
  selector,
}: ReadingProgress) => {
  const sql = neon(getDatabaseUrl());

  await sql`
    INSERT INTO reading_progress (book_slug, page_url, quote, prefix, suffix)
    VALUES (
      ${bookSlug},
      ${pageUrl},
      ${selector?.exact ?? null},
      ${selector?.prefix ?? null},
      ${selector?.suffix ?? null}
    )
    ON CONFLICT (book_slug)
    DO UPDATE SET
      page_url = EXCLUDED.page_url,
      quote = EXCLUDED.quote,
      prefix = EXCLUDED.prefix,
      suffix = EXCLUDED.suffix,
      updated_at = CURRENT_TIMESTAMP
  `;
};
