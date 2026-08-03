import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/feature/auth/constants';
import { isAuthBypass } from '@/feature/auth/env';
import {
  docsContentRoute,
  docsRoute,
  publicAssetRoute,
  publicPageRoute,
} from '@/feature/common/app';

const REMOVED_AUTH_PAGES = ['/enroll', '/settings/passkeys'];
const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

const isPublicPath = (pathname: string) =>
  pathname === '/sign-in' ||
  pathname.startsWith('/api/auth/') ||
  pathname === publicPageRoute ||
  pathname.startsWith(`${publicPageRoute}/`) ||
  pathname === publicAssetRoute ||
  pathname.startsWith(`${publicAssetRoute}/`) ||
  pathname.startsWith('/_next/') ||
  pathname === '/favicon.ico' ||
  pathname === '/icon.png' ||
  pathname === '/apple-icon.png' ||
  pathname === '/logo.png';

export const proxy = (request: NextRequest) => {
  if (REMOVED_AUTH_PAGES.includes(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (!isAuthBypass() && !request.cookies.has(SESSION_COOKIE_NAME)) {
    const destination = new URL('/sign-in', request.url);

    return NextResponse.redirect(destination);
  }

  const suffixResult = rewriteSuffix(request.nextUrl.pathname);
  if (suffixResult) {
    return NextResponse.rewrite(new URL(suffixResult, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const docsResult = rewriteDocs(request.nextUrl.pathname);

    if (docsResult) {
      return NextResponse.rewrite(new URL(docsResult, request.nextUrl));
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
