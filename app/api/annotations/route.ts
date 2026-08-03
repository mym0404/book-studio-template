import {
  createAnnotationRequestSchema,
  deleteAnnotationRequestSchema,
  updateAnnotationRequestSchema,
} from '@/feature/annotations/model/annotation';
import { getAnnotationPageUrl } from '@/feature/annotations/model/annotation-page';
import {
  deleteAnnotation,
  getAnnotations,
  saveAnnotation,
  updateAnnotationComment,
} from '@/feature/annotations/repositories/annotations';
import { hasMutationAccess, withPrivateNoStore } from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';

export const dynamic = 'force-dynamic';

const badRequest = () =>
  withPrivateNoStore(new Response(null, { status: 400 }));

const notFound = () => withPrivateNoStore(new Response(null, { status: 404 }));

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

  const body = createAnnotationRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );

  if (!body.success) return badRequest();

  const pageUrl = getAnnotationPageUrl({ pathname: body.data.pageUrl });

  if (!pageUrl) return badRequest();

  const annotation = await saveAnnotation({
    comment: body.data.comment,
    pageUrl,
    selector: body.data.selector,
    startOffset: body.data.startOffset,
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

  const body = updateAnnotationRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );

  if (!body.success) return badRequest();

  const annotation = await updateAnnotationComment({
    comment: body.data.comment,
    id: body.data.id,
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

  const body = deleteAnnotationRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );

  if (!body.success) return badRequest();

  if (!(await deleteAnnotation({ id: body.data.id }))) return notFound();

  return withPrivateNoStore(new Response(null, { status: 204 }));
};
