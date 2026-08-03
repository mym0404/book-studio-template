'use client';

import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  type PasskeyMode,
  passkeyModeResponseSchema,
  passkeyOptionsResponseSchema,
} from '@/feature/auth/passkey-schema';

const readJson = async (response: Response): Promise<unknown> =>
  response.json().catch(() => undefined);

const getRequestError = ({
  mode,
  response,
}: {
  mode: PasskeyMode;
  response: Response;
}) => {
  if (response.status === 503) {
    return 'The sign-in service is temporarily unavailable.';
  }

  if (response.status === 409) {
    return 'Owner setup changed. Reload this page and try again.';
  }

  return mode === 'setup'
    ? 'The setup token or passkey was not accepted.'
    : 'This passkey is not authorized.';
};

export const SignInPage = () => {
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<PasskeyMode>();
  const [pending, setPending] = useState(false);
  const [setupToken, setSetupToken] = useState('');

  useEffect(() => {
    let active = true;

    const loadMode = async () => {
      try {
        const response = await fetch('/api/auth/passkey', {
          credentials: 'same-origin',
        });
        const value = await readJson(response);
        const result = passkeyModeResponseSchema.safeParse(value);

        if (!response.ok || !result.success) {
          throw new Error(
            response.status === 503
              ? 'The sign-in service is temporarily unavailable.'
              : 'Passkey sign-in is unavailable.',
          );
        }

        if (active) setMode(result.data.mode);
      } catch (caughtError) {
        if (!active) return;

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Passkey sign-in is unavailable.',
        );
      }
    };

    void loadMode();

    return () => {
      active = false;
    };
  }, []);

  const continueWithPasskey = async () => {
    if (!mode) return;

    setError(undefined);
    setPending(true);

    try {
      const optionsResponse = await fetch('/api/auth/passkey', {
        body: JSON.stringify({
          action: 'options',
          ...(mode === 'setup' ? { setupToken } : {}),
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const value = await readJson(optionsResponse);

      if (!optionsResponse.ok) {
        throw new Error(getRequestError({ mode, response: optionsResponse }));
      }

      const result = passkeyOptionsResponseSchema.safeParse(value);
      const credential = result.success
        ? result.data.mode === 'authentication'
          ? await startAuthentication({ optionsJSON: result.data.options })
          : await startRegistration({ optionsJSON: result.data.options })
        : undefined;

      if (!credential) throw new Error('Passkey sign-in is unavailable.');

      const verificationResponse = await fetch('/api/auth/passkey', {
        body: JSON.stringify({ action: 'verify', response: credential }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!verificationResponse.ok) {
        throw new Error(
          getRequestError({ mode, response: verificationResponse }),
        );
      }

      window.location.assign('/docs');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The passkey request could not be completed.',
      );
      setPending(false);
    }
  };

  const isSetup = mode === 'setup';

  return (
    <main
      className={'flex min-h-screen items-center justify-center px-6 py-16'}
    >
      <section
        className={
          'w-full max-w-md rounded-2xl border bg-fd-card p-8 shadow-sm'
        }
      >
        <div className={'mb-8 flex items-center gap-3'}>
          <Image src={'/logo.png'} alt={''} width={40} height={40} />
          <div>
            <h1 className={'text-2xl font-bold tracking-tight'}>Book Studio</h1>
            <p className={'text-sm text-fd-muted-foreground'}>
              Private reading library
            </p>
          </div>
        </div>
        <div className={'flex flex-col gap-4'}>
          {isSetup && (
            <label className={'flex flex-col gap-2 text-sm font-medium'}>
              Owner setup token
              <input
                autoComplete={'off'}
                className={
                  'h-11 rounded-lg border bg-fd-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-fd-ring'
                }
                disabled={pending}
                onChange={(event) => setSetupToken(event.target.value)}
                spellCheck={false}
                type={'password'}
                value={setupToken}
              />
            </label>
          )}
          <button
            className={
              'h-11 rounded-lg bg-fd-primary px-5 font-semibold text-fd-primary-foreground disabled:cursor-not-allowed disabled:opacity-60'
            }
            disabled={!mode || pending || (isSetup && !setupToken.trim())}
            onClick={continueWithPasskey}
            type={'button'}
          >
            {pending
              ? 'Waiting for your device…'
              : isSetup
                ? 'Set up owner passkey'
                : mode
                  ? 'Sign in with a passkey'
                  : 'Checking sign-in…'}
          </button>
          {error && (
            <p
              className={'text-sm text-red-600 dark:text-red-400'}
              role={'alert'}
            >
              {error}
            </p>
          )}
          <p className={'text-xs leading-5 text-fd-muted-foreground'}>
            {isSetup
              ? 'Register the single owner passkey for this library.'
              : 'Only the registered owner passkey can open this library. There is no password or account recovery fallback.'}
          </p>
        </div>
      </section>
    </main>
  );
};
