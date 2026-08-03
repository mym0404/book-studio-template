import { notFound } from 'next/navigation';
import { withPrivateNoStore } from '@/lib/auth/security';
import { requireOwnerRequest } from '@/lib/auth/session';
import { createBrandOgImage } from '@/lib/og-image';
import { source } from '@/lib/source';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: RouteContext<'/og/docs/[...slug]'>,
) {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return withPrivateNoStore(
    await createBrandOgImage({
      title: page.data.title,
      description: page.data.description,
    }),
  );
}
