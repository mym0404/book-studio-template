import { getAuthEnv } from './env';

export const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return undefined;

  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return undefined;
  }
};

export const hasTrustedOrigin = (request: Request) =>
  request.headers.get('origin') === getAuthEnv().origin;

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  Pragma: 'no-cache',
  Vary: 'Cookie',
};

export const withPrivateNoStore = (response: Response) => {
  const headers = new Headers(response.headers);

  Object.entries(PRIVATE_NO_STORE_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};
