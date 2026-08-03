import { notFound } from 'next/navigation';
import { getAnnotationsForBook } from '@/lib/annotations';
import { withPrivateNoStore } from '@/lib/auth/security';
import { requireOwnerRequest } from '@/lib/auth/session';
import { isBookSlug } from '@/lib/reading-progress';
import {
  getBookTitle,
  getSavedHighlightGroups,
  getSavedHighlightsMarkdown,
} from '@/lib/saved-highlights';
import { getLLMText, source } from '@/lib/source';

export const dynamic = 'force-dynamic';

const respondWithMarkdown = ({ markdown }: { markdown: string }) =>
  withPrivateNoStore(
    new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
      },
    }),
  );

export const GET = async (
  request: Request,
  { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>,
) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  const { slug } = await params;
  const [bookSlug, savedSegment, contentSegment] = slug ?? [];

  if (
    slug?.length === 3 &&
    savedSegment === 'saved' &&
    contentSegment === 'content.md'
  ) {
    if (!isBookSlug(bookSlug)) notFound();

    const bookTitle = getBookTitle({ bookSlug });

    if (!bookTitle) notFound();

    const annotations = await getAnnotationsForBook({ bookSlug });
    const groups = getSavedHighlightGroups({ annotations, bookSlug });
    const markdown = getSavedHighlightsMarkdown({ bookTitle, groups });

    return respondWithMarkdown({ markdown });
  }

  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  return respondWithMarkdown({ markdown: await getLLMText(page) });
};
