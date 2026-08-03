import { createFromSource } from 'fumadocs-core/search/server';
import { withPrivateNoStore } from '@/lib/auth/security';
import { requireOwnerRequest } from '@/lib/auth/session';
import { source } from '@/lib/source';

export const dynamic = 'force-dynamic';

const search = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const GET = async (request: Request) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  return withPrivateNoStore(await search.GET(request));
};
