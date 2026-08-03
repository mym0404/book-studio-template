import { z } from 'zod';
import { annotationTextQuoteSelectorSchema } from '@/feature/reading/model/text-quote-selector';

export const MAX_ANNOTATION_COMMENT_LENGTH = 2_000;

const ANNOTATION_ANCHOR_PREFIX = 'annotation-';

export const annotationCommentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_ANNOTATION_COMMENT_LENGTH);

export const annotationStartOffsetSchema = z.int32().nonnegative();

const annotationIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

export const annotationSchema = z.object({
  comment: annotationCommentSchema.optional(),
  id: annotationIdSchema,
  pageUrl: z.string(),
  selector: annotationTextQuoteSelectorSchema,
  startOffset: annotationStartOffsetSchema.optional(),
});

export type Annotation = z.infer<typeof annotationSchema>;

export const createAnnotationRequestSchema = annotationSchema
  .pick({
    comment: true,
    pageUrl: true,
    selector: true,
    startOffset: true,
  })
  .required({
    pageUrl: true,
    selector: true,
    startOffset: true,
  });

export const updateAnnotationRequestSchema = z.object({
  comment: annotationCommentSchema,
  id: annotationIdSchema,
});

export const deleteAnnotationRequestSchema = z.object({
  id: annotationIdSchema,
});

export const annotationResponseSchema = z.object({
  annotation: annotationSchema,
});

export const annotationListResponseSchema = z.object({
  annotations: z.array(annotationSchema),
});

export const getAnnotationAnchorId = ({ id }: { id: string }) =>
  `${ANNOTATION_ANCHOR_PREFIX}${id}`;
