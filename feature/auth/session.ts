import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME } from '@/feature/auth/constants';
import { isAuthBypass } from '@/feature/auth/env';
import { hasStoredSession } from '@/feature/auth/repositories/auth';
import {
  getCookieValue,
  PRIVATE_NO_STORE_HEADERS,
} from '@/feature/auth/security';
import { hashOpaqueToken, opaqueTokenSchema } from '@/feature/auth/tokens';

export const hasOwnerSession = async (requestHeaders: Headers) => {
  const token = getCookieValue(
    requestHeaders.get('cookie'),
    SESSION_COOKIE_NAME,
  );

  if (!token || !opaqueTokenSchema.safeParse(token).success) return false;

  return hasStoredSession({ tokenHash: hashOpaqueToken(token) });
};

/** Authoritatively protects server-rendered pages; proxy redirects are only an early cookie-presence check. */
export const requireOwnerPage = async () => {
  if (isAuthBypass()) return;

  const hasSession = await hasOwnerSession(await headers());

  if (!hasSession) redirect('/sign-in');
};

/** Authoritatively protects requests and keeps authentication failures private and uncacheable. */
export const requireOwnerRequest = async (request: Request) => {
  if (isAuthBypass()) return;

  try {
    const hasSession = await hasOwnerSession(request.headers);

    if (hasSession) return;

    return new Response(null, {
      headers: PRIVATE_NO_STORE_HEADERS,
      status: 401,
    });
  } catch {
    return new Response(null, {
      headers: PRIVATE_NO_STORE_HEADERS,
      status: 503,
    });
  }
};
