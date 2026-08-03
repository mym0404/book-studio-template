import { hasMutationAccess, withPrivateNoStore } from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';
import { isBookSlug } from '@/feature/library/books';
import {
  getReadingProgressTarget,
  readingProgressRequestSchema,
} from '@/feature/reading/model/reading-progress';
import {
  getReadingProgressForBook,
  saveReadingProgress,
} from '@/feature/reading/repositories/reading-progress';

export const dynamic = 'force-dynamic';

const badRequest = () =>
  withPrivateNoStore(new Response(null, { status: 400 }));

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

  const bodyResult = readingProgressRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );

  if (!bodyResult.success) return badRequest();

  const target = getReadingProgressTarget(bodyResult.data);

  if (!target) return badRequest();

  await saveReadingProgress(target);

  return withPrivateNoStore(new Response(null, { status: 204 }));
};
