import { type NextRequest, NextResponse } from 'next/server';
import {
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_EXPIRES_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRES_SECONDS,
} from '@/feature/auth/constants';
import {
  createPasskeyOptions,
  getPasskeyMode,
  verifyOwnerPasskey,
} from '@/feature/auth/passkey';
import { passkeyRequestSchema } from '@/feature/auth/passkey-schema';
import {
  getCookieValue,
  hasTrustedOrigin,
  PRIVATE_NO_STORE_HEADERS,
} from '@/feature/auth/security';

export const dynamic = 'force-dynamic';

const errorResponse = (status: 400 | 401 | 409 | 503) =>
  new NextResponse(null, {
    headers: PRIVATE_NO_STORE_HEADERS,
    status,
  });

const clearChallengeCookie = (response: NextResponse) => {
  response.cookies.set(CHALLENGE_COOKIE_NAME, '', {
    maxAge: 0,
    path: '/api/auth/passkey',
  });

  return response;
};

export const GET = async () => {
  try {
    return NextResponse.json(
      { mode: await getPasskeyMode() },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch {
    return errorResponse(503);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    if (!hasTrustedOrigin(request)) return errorResponse(401);

    const bodyResult = passkeyRequestSchema.safeParse(
      await request.json().catch(() => undefined),
    );
    if (!bodyResult.success) return errorResponse(400);

    const body = bodyResult.data;

    if (body.action === 'options') {
      const result = await createPasskeyOptions({
        setupToken: body.setupToken,
      });

      if (!result) return errorResponse(401);

      const response = NextResponse.json(
        { mode: result.mode, options: result.options },
        { headers: PRIVATE_NO_STORE_HEADERS },
      );

      response.cookies.set(CHALLENGE_COOKIE_NAME, result.challengeToken, {
        httpOnly: true,
        maxAge: CHALLENGE_EXPIRES_SECONDS,
        path: '/api/auth/passkey',
        sameSite: 'strict',
        secure: true,
      });

      return response;
    }

    const challengeToken = getCookieValue(
      request.headers.get('cookie'),
      CHALLENGE_COOKIE_NAME,
    );

    if (!challengeToken) return errorResponse(401);

    const result = await verifyOwnerPasskey({
      challengeToken,
      response: body.response,
    });

    if (result.status !== 'verified') {
      return clearChallengeCookie(
        errorResponse(result.status === 'conflict' ? 409 : 401),
      );
    }

    const response = clearChallengeCookie(
      new NextResponse(null, {
        headers: PRIVATE_NO_STORE_HEADERS,
        status: 204,
      }),
    );

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      maxAge: SESSION_EXPIRES_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });

    return response;
  } catch {
    return errorResponse(503);
  }
};
