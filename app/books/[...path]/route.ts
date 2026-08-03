import {
  PRIVATE_NO_STORE_HEADERS,
  withPrivateNoStore,
} from '@/lib/auth/security';
import { requireOwnerRequest } from '@/lib/auth/session';
import { getBookAssetResponse } from '@/lib/book-assets';

export const dynamic = 'force-dynamic';

export const GET = async (
  request: Request,
  { params }: RouteContext<'/books/[...path]'>,
) => {
  const session = await requireOwnerRequest(request);

  if (session instanceof Response) return withPrivateNoStore(session);

  const { path } = await params;

  return getBookAssetResponse({
    headers: PRIVATE_NO_STORE_HEADERS,
    path,
  });
};
