import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { isDevelopmentAuthBypass } from '@/lib/auth/env';
import { hasOwnerSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function SignInLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  if (isDevelopmentAuthBypass()) {
    redirect('/docs');
  }

  const hasSession = await hasOwnerSession(await headers());

  if (hasSession) redirect('/docs');

  return children;
}
