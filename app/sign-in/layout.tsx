import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { isDevelopmentAuthBypass } from '@/feature/auth/env';
import { hasOwnerSession } from '@/feature/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
};

const SignInLayout = async ({
  children,
}: Readonly<{ children: ReactNode }>) => {
  if (isDevelopmentAuthBypass()) {
    redirect('/docs');
  }

  const hasSession = await hasOwnerSession(await headers());

  if (hasSession) redirect('/docs');

  return children;
};

export default SignInLayout;
