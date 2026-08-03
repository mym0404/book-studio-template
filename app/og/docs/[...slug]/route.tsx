import { notFound } from 'next/navigation';
import { withPrivateNoStore } from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';
import { createBrandOgImage } from '@/feature/common/ui/brand-og-image';
import { source } from '@/feature/library/source';

export const dynamic = 'force-dynamic';

export const GET = async (
  request: Request,
  { params }: RouteContext<'/og/docs/[...slug]'>,
) => {
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
};
