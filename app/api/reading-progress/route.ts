import { hasMutationAccess, withPrivateNoStore } from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';
import { isBookSlug } from '@/feature/library/books';
import { getReadingProgressTarget } from '@/feature/reading/model/reading-progress';
import {
  isTextQuoteSelector,
  type TextQuoteSelector,
} from '@/feature/reading/model/text-quote-selector';
import {
  getReadingProgressForBook,
  saveReadingProgress,
} from '@/feature/reading/repositories/reading-progress';

export const dynamic = 'force-dynamic';

const badRequest = () =>
  withPrivateNoStore(new Response(null, { status: 400 }));

const isReadingProgressBody = (
  value: unknown,
): value is { pathname: string; selector?: TextQuoteSelector } =>
  typeof value === 'object' &&
  value !== null &&
  'pathname' in value &&
  typeof value.pathname === 'string' &&
  (!('selector' in value) || isTextQuoteSelector(value.selector));

export const GET = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  const bookSlug = new URL(request.url).searchParams.get('bookSlug');

  if (!bookSlug || !isBookSlug(bookSlug)) return badRequest();

  const progress = await getReadingProgressForBook({ bookSlug });

  return withPrivateNoStore(Response.json({ progress }));
};

export const POST = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);
  if (!hasMutationAccess(request)) {
    return withPrivateNoStore(new Response(null, { status: 401 }));
  }

  const body: unknown = await request.json().catch(() => undefined);

  if (!isReadingProgressBody(body)) return badRequest();

  const target = getReadingProgressTarget({
    pathname: body.pathname,
    selector: body.selector,
  });

  if (!target) return badRequest();

  await saveReadingProgress(target);

  return withPrivateNoStore(new Response(null, { status: 204 }));
};
