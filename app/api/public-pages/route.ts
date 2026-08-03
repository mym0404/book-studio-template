import { hasMutationAccess, withPrivateNoStore } from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';
import { getShareablePage } from '@/feature/sharing/public-page';
import {
  publishPage,
  unpublishPage,
} from '@/feature/sharing/repositories/public-pages';

export const dynamic = 'force-dynamic';

const badRequest = () =>
  withPrivateNoStore(new Response(null, { status: 400 }));

const unauthorized = () =>
  withPrivateNoStore(new Response(null, { status: 401 }));

const getPageUrl = async (request: Request) => {
  const body: unknown = await request.json().catch(() => undefined);

  if (
    typeof body !== 'object' ||
    body === null ||
    !('pageUrl' in body) ||
    typeof body.pageUrl !== 'string'
  ) {
    return undefined;
  }

  return getShareablePage({ pageUrl: body.pageUrl })?.page.url;
};

export const PUT = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) return unauthorized();

  const pageUrl = await getPageUrl(request);

  if (!pageUrl) return badRequest();

  await publishPage({ pageUrl });

  return withPrivateNoStore(new Response(null, { status: 204 }));
};

export const DELETE = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) return unauthorized();

  const pageUrl = await getPageUrl(request);

  if (!pageUrl) return badRequest();

  await unpublishPage({ pageUrl });

  return withPrivateNoStore(new Response(null, { status: 204 }));
};
