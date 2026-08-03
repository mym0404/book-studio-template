import { isAnnotationComment, isAnnotationStartOffset } from '@/lib/annotation';
import {
  deleteAnnotation,
  getAnnotationPageUrl,
  getAnnotations,
  saveAnnotation,
  updateAnnotationComment,
} from '@/lib/annotations';
import { isDevelopmentAuthBypass } from '@/lib/auth/env';
import { hasTrustedOrigin, withPrivateNoStore } from '@/lib/auth/security';
import { requireOwnerRequest } from '@/lib/auth/session';
import {
  isAnnotationTextQuoteSelector,
  type TextQuoteSelector,
} from '@/lib/text-quote-selector';

export const dynamic = 'force-dynamic';

const badRequest = () =>
  withPrivateNoStore(new Response(null, { status: 400 }));

const notFound = () => withPrivateNoStore(new Response(null, { status: 404 }));

const isAnnotationId = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const isCreateAnnotationBody = (
  value: unknown,
): value is {
  comment?: string;
  pageUrl: string;
  selector: TextQuoteSelector;
  startOffset: number;
} =>
  typeof value === 'object' &&
  value !== null &&
  'pageUrl' in value &&
  typeof value.pageUrl === 'string' &&
  'selector' in value &&
  isAnnotationTextQuoteSelector(value.selector) &&
  'startOffset' in value &&
  isAnnotationStartOffset(value.startOffset) &&
  (!('comment' in value) || isAnnotationComment(value.comment));

const isUpdateAnnotationBody = (
  value: unknown,
): value is { comment: string; id: string } =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  isAnnotationId(value.id) &&
  'comment' in value &&
  isAnnotationComment(value.comment);

const isDeleteAnnotationBody = (value: unknown): value is { id: string } =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  isAnnotationId(value.id);

const hasMutationAccess = (request: Request) =>
  isDevelopmentAuthBypass() || hasTrustedOrigin(request);

export const GET = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  const pageUrl = new URL(request.url).searchParams.get('pageUrl');

  if (!pageUrl || !getAnnotationPageUrl({ pathname: pageUrl })) {
    return badRequest();
  }

  const annotations = await getAnnotations({ pageUrl });

  return withPrivateNoStore(Response.json({ annotations }));
};

export const POST = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) {
    return withPrivateNoStore(new Response(null, { status: 401 }));
  }

  const body: unknown = await request.json().catch(() => undefined);

  if (!isCreateAnnotationBody(body)) return badRequest();

  const pageUrl = getAnnotationPageUrl({ pathname: body.pageUrl });

  if (!pageUrl) return badRequest();

  const annotation = await saveAnnotation({
    comment: body.comment?.trim(),
    pageUrl,
    selector: body.selector,
    startOffset: body.startOffset,
  });

  if (!annotation) return badRequest();

  return withPrivateNoStore(Response.json({ annotation }));
};

export const PATCH = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) {
    return withPrivateNoStore(new Response(null, { status: 401 }));
  }

  const body: unknown = await request.json().catch(() => undefined);

  if (!isUpdateAnnotationBody(body)) return badRequest();

  const annotation = await updateAnnotationComment({
    comment: body.comment.trim(),
    id: body.id,
  });

  if (!annotation) return notFound();

  return withPrivateNoStore(Response.json({ annotation }));
};

export const DELETE = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) {
    return withPrivateNoStore(new Response(null, { status: 401 }));
  }

  const body: unknown = await request.json().catch(() => undefined);

  if (!isDeleteAnnotationBody(body)) return badRequest();

  if (!(await deleteAnnotation({ id: body.id }))) return notFound();

  return withPrivateNoStore(new Response(null, { status: 204 }));
};
