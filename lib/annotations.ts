import { neon } from '@neondatabase/serverless';
import { type Annotation, isAnnotation } from './annotation';
import { getDatabaseUrl } from './database';
import { getBookSlugForPathname } from './reading-progress';
import { docsRoute } from './shared';
import { source } from './source';
import type { TextQuoteSelector } from './text-quote-selector';

type AnnotationRow = {
  comment: string | null;
  id: string;
  page_url: string;
  prefix: string;
  quote: string;
  start_offset: number | null;
  suffix: string;
};

const isAnnotationRow = (value: unknown): value is AnnotationRow =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'page_url' in value &&
  typeof value.page_url === 'string' &&
  'quote' in value &&
  typeof value.quote === 'string' &&
  'prefix' in value &&
  typeof value.prefix === 'string' &&
  'suffix' in value &&
  typeof value.suffix === 'string' &&
  'start_offset' in value &&
  (typeof value.start_offset === 'number' || value.start_offset === null) &&
  'comment' in value &&
  (typeof value.comment === 'string' || value.comment === null);

const toAnnotation = (row: AnnotationRow): Annotation | undefined => {
  const annotation = {
    id: row.id,
    pageUrl: row.page_url,
    selector: {
      exact: row.quote,
      prefix: row.prefix,
      suffix: row.suffix,
    },
    ...(row.start_offset !== null ? { startOffset: row.start_offset } : {}),
    ...(row.comment ? { comment: row.comment } : {}),
  };

  return isAnnotation(annotation) ? annotation : undefined;
};

export const getAnnotationPageUrl = ({ pathname }: { pathname: string }) => {
  const bookSlug = getBookSlugForPathname({ pathname });

  if (!bookSlug) return undefined;

  const page = source.getPage(
    pathname.slice(`${docsRoute}/`.length).split('/'),
  );

  if (!page || page.url !== pathname) {
    return undefined;
  }

  return page.url;
};

export const getAnnotations = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT id, page_url, quote, prefix, suffix, start_offset, comment
    FROM annotations
    WHERE page_url = ${pageUrl}
    ORDER BY created_at ASC
  `;

  return rows.flatMap((row) => {
    if (!isAnnotationRow(row)) return [];

    const annotation = toAnnotation(row);

    return annotation ? [annotation] : [];
  });
};

export const getAnnotationsForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const bookUrl = `${docsRoute}/${bookSlug}`;
  const rows = await sql`
    SELECT id, page_url, quote, prefix, suffix, start_offset, comment
    FROM annotations
    WHERE page_url = ${bookUrl} OR page_url LIKE ${`${bookUrl}/%`}
    ORDER BY updated_at DESC
  `;

  return rows.flatMap((row) => {
    if (!isAnnotationRow(row)) return [];

    const annotation = toAnnotation(row);

    return annotation ? [annotation] : [];
  });
};

export const saveAnnotation = async ({
  comment,
  pageUrl,
  selector,
  startOffset,
}: {
  comment?: string;
  pageUrl: string;
  selector: TextQuoteSelector;
  startOffset: number;
}) => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    INSERT INTO annotations (
      page_url,
      quote,
      prefix,
      suffix,
      start_offset,
      comment
    )
    VALUES (
      ${pageUrl},
      ${selector.exact},
      ${selector.prefix},
      ${selector.suffix},
      ${startOffset},
      ${comment ?? null}
    )
    ON CONFLICT (page_url, quote, prefix, suffix)
    DO UPDATE SET
      comment = COALESCE(EXCLUDED.comment, annotations.comment),
      start_offset = EXCLUDED.start_offset,
      updated_at = CASE
        WHEN EXCLUDED.comment IS NULL THEN annotations.updated_at
        ELSE CURRENT_TIMESTAMP
      END
    RETURNING id, page_url, quote, prefix, suffix, start_offset, comment
  `;

  return isAnnotationRow(row) ? toAnnotation(row) : undefined;
};

export const updateAnnotationComment = async ({
  comment,
  id,
}: {
  comment: string;
  id: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    UPDATE annotations
    SET comment = ${comment}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, page_url, quote, prefix, suffix, start_offset, comment
  `;

  return isAnnotationRow(row) ? toAnnotation(row) : undefined;
};

export const deleteAnnotation = async ({ id }: { id: string }) => {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    DELETE FROM annotations
    WHERE id = ${id}
    RETURNING id
  `;

  return rows.length > 0;
};
