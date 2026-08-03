import {
  PRIVATE_NO_STORE_HEADERS,
  withPrivateNoStore,
} from '@/feature/auth/security';
import { requireOwnerRequest } from '@/feature/auth/session';
import { getBookAssetResponse } from '@/feature/library/assets';

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
