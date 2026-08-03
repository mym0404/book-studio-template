import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME } from './constants';
import { hasStoredSession } from './database';
import { isDevelopmentAuthBypass } from './env';
import { getCookieValue, PRIVATE_NO_STORE_HEADERS } from './security';
import { hashOpaqueToken, isOpaqueToken } from './tokens';

export const hasOwnerSession = async (requestHeaders: Headers) => {
  const token = getCookieValue(
    requestHeaders.get('cookie'),
    SESSION_COOKIE_NAME,
  );

  if (!token || !isOpaqueToken(token)) return false;

  return hasStoredSession({ tokenHash: hashOpaqueToken(token) });
};

export const requireOwnerPage = async () => {
  if (isDevelopmentAuthBypass()) return;

  const hasSession = await hasOwnerSession(await headers());

  if (!hasSession) redirect('/sign-in');
};

export const requireOwnerRequest = async (request: Request) => {
  if (isDevelopmentAuthBypass()) return;

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
