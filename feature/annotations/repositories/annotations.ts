import { z } from 'zod';
import {
  type Annotation,
  annotationSchema,
} from '@/feature/annotations/model/annotation';
import { docsRoute } from '@/feature/common/app';
import { getDatabase } from '@/feature/common/database';

const annotationRowSchema = z
  .object({
    comment: z.string().nullable(),
    id: z.string(),
    page_url: z.string(),
    prefix: z.string(),
    quote: z.string(),
    start_offset: z.number().nullable(),
    suffix: z.string(),
  })
  .transform((row) => ({
    ...(row.comment ? { comment: row.comment } : {}),
    id: row.id,
    pageUrl: row.page_url,
    selector: {
      exact: row.quote,
      prefix: row.prefix,
      suffix: row.suffix,
    },
    ...(row.start_offset !== null ? { startOffset: row.start_offset } : {}),
  }))
  .pipe(annotationSchema);

const parseAnnotationRow = (row: unknown) => {
  const result = annotationRowSchema.safeParse(row);

  return result.success ? result.data : undefined;
};

export const getAnnotations = async ({ pageUrl }: { pageUrl: string }) => {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, page_url, quote, prefix, suffix, start_offset, comment
    FROM annotations
    WHERE page_url = ${pageUrl}
    ORDER BY created_at ASC
  `;

  return rows.flatMap((row) => {
    const annotation = parseAnnotationRow(row);

    return annotation ? [annotation] : [];
  });
};

export const getAnnotationsForBook = async ({
  bookSlug,
}: {
  bookSlug: string;
}) => {
  const sql = getDatabase();
  const bookUrl = `${docsRoute}/${bookSlug}`;
  const rows = await sql`
    SELECT id, page_url, quote, prefix, suffix, start_offset, comment
    FROM annotations
    WHERE page_url = ${bookUrl} OR page_url LIKE ${`${bookUrl}/%`}
    ORDER BY updated_at DESC
  `;

  return rows.flatMap((row) => {
    const annotation = parseAnnotationRow(row);

    return annotation ? [annotation] : [];
  });
};

/**
 * Upserts a highlight without erasing its existing comment or advancing the
 * saved-notes order unless this call carries a comment.
 */
export const saveAnnotation = async ({
  comment,
  pageUrl,
  selector,
  startOffset,
}: {
  comment?: string;
  pageUrl: string;
  selector: Annotation['selector'];
  startOffset: number;
}) => {
  const sql = getDatabase();
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

  return parseAnnotationRow(row);
};

export const updateAnnotationComment = async ({
  comment,
  id,
}: {
  comment: string;
  id: string;
}) => {
  const sql = getDatabase();
  const [row] = await sql`
    UPDATE annotations
    SET comment = ${comment}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, page_url, quote, prefix, suffix, start_offset, comment
  `;

  return parseAnnotationRow(row);
};

export const deleteAnnotation = async ({ id }: { id: string }) => {
  const sql = getDatabase();
  const rows = await sql`
    DELETE FROM annotations
    WHERE id = ${id}
    RETURNING id
  `;

  return rows.length > 0;
};
