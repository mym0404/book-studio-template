import {
  isAnnotationTextQuoteSelector,
  type TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';

export const MAX_ANNOTATION_COMMENT_LENGTH = 2_000;

const ANNOTATION_ANCHOR_PREFIX = 'annotation-';

export type Annotation = {
  comment?: string;
  id: string;
  pageUrl: string;
  selector: TextQuoteSelector;
  startOffset?: number;
};

export const isAnnotationStartOffset = (value: unknown) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 2_147_483_647;

export const isAnnotationComment = (value: unknown) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= MAX_ANNOTATION_COMMENT_LENGTH;

export const isAnnotation = (value: unknown): value is Annotation =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'pageUrl' in value &&
  typeof value.pageUrl === 'string' &&
  'selector' in value &&
  isAnnotationTextQuoteSelector(value.selector) &&
  (!('startOffset' in value) ||
    value.startOffset === undefined ||
    isAnnotationStartOffset(value.startOffset)) &&
  (!('comment' in value) ||
    value.comment === undefined ||
    isAnnotationComment(value.comment));

export const getAnnotationAnchorId = ({ id }: { id: string }) =>
  `${ANNOTATION_ANCHOR_PREFIX}${id}`;
