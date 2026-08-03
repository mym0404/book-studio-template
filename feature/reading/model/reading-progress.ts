import { z } from 'zod';
import { docsRoute } from '@/feature/common/app';
import { getBookSlugForPathname } from '@/feature/library/books';
import { source } from '@/feature/library/source';
import { textQuoteSelectorSchema } from '@/feature/reading/model/text-quote-selector';

export const readingProgressSchema = z.object({
  bookSlug: z.string(),
  pageTitle: z.string().optional(),
  pageUrl: z.string(),
  selector: textQuoteSelectorSchema.optional(),
});

export const readingProgressRequestSchema = z.object({
  pathname: z.string(),
  selector: textQuoteSelectorSchema.optional(),
});

const savedReadingProgressSchema = readingProgressSchema.extend({
  pageTitle: z.string(),
  selector: textQuoteSelectorSchema,
});

export const readingProgressResponseSchema = z.object({
  progress: savedReadingProgressSchema.optional(),
});

export const readingProgressResumeSchema = z.object({
  selector: textQuoteSelectorSchema,
});

export type ReadingProgress = z.infer<typeof readingProgressSchema>;
export type ReadingProgressRequest = z.infer<
  typeof readingProgressRequestSchema
>;
export type ReadingProgressResponse = z.infer<
  typeof readingProgressResponseSchema
>;

export const getReadingProgressTarget = ({
  pathname,
  selector,
}: ReadingProgressRequest): ReadingProgress | undefined => {
  const bookSlug = getBookSlugForPathname({ pathname });

  if (!bookSlug) return undefined;

  const page = source.getPage(
    pathname.slice(`${docsRoute}/`.length).split('/'),
  );

  if (
    !page ||
    page.url !== pathname ||
    page.url === `${docsRoute}/${bookSlug}`
  ) {
    return undefined;
  }

  const result = readingProgressSchema.safeParse({
    bookSlug,
    pageUrl: page.url,
    selector,
  });

  return result.success ? result.data : undefined;
};
