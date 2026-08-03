import { z } from 'zod';
import { docsRoute } from '@/feature/common/app';
import { getDatabase } from '@/feature/common/database';
import { source } from '@/feature/library/source';
import {
  type ReadingProgress,
  readingProgressSchema,
} from '@/feature/reading/model/reading-progress';
import { textQuoteSelectorSchema } from '@/feature/reading/model/text-quote-selector';

const readingProgressRowSchema = z.object({
  book_slug: z.string(),
  page_url: z.string(),
  prefix: z.string().nullable(),
  quote: z.string().nullable(),
  suffix: z.string().nullable(),
});

export const getReadingProgressForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}): Promise<ReadingProgress | undefined> => {
  const sql = getDatabase();
  const [row] = await sql`
    SELECT book_slug, page_url, quote, prefix, suffix
    FROM reading_progress
    WHERE book_slug = ${bookSlug}
  `;

  const rowResult = readingProgressRowSchema.safeParse(row);

  if (!rowResult.success) return undefined;

  const selectorResult = textQuoteSelectorSchema.safeParse({
    exact: rowResult.data.quote ?? '',
    prefix: rowResult.data.prefix ?? '',
    suffix: rowResult.data.suffix ?? '',
  });

  if (!selectorResult.success) return undefined;

  const page = source.getPage(
    rowResult.data.page_url.slice(`${docsRoute}/`.length).split('/'),
  );
  const progressResult = readingProgressSchema.safeParse({
    bookSlug: rowResult.data.book_slug,
    pageTitle:
      typeof page?.data.title === 'string'
        ? page.data.title
        : rowResult.data.page_url,
    pageUrl: rowResult.data.page_url,
    selector: selectorResult.data,
  });

  return progressResult.success ? progressResult.data : undefined;
};

export const saveReadingProgress = async ({
  bookSlug,
  pageUrl,
  selector,
}: ReadingProgress) => {
  const sql = getDatabase();

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
