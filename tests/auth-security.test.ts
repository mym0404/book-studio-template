import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHALLENGE_EXPIRES_SECONDS,
  SESSION_EXPIRES_SECONDS,
} from '../lib/auth/constants';
import {
  getAuthEnv,
  isDevelopmentAuthBypass,
  isValidOwnerSetupToken,
} from '../lib/auth/env';
import {
  createAuthenticationOptions,
  createRegistrationOptions,
} from '../lib/auth/passkey';
import { getCookieValue } from '../lib/auth/security';
import {
  createOpaqueToken,
  hashOpaqueToken,
  isOpaqueToken,
} from '../lib/auth/tokens';
import {
  getPublicAssetContentDigest,
  getPublicAssetUrl,
  hasValidPublicAssetSignature,
} from '../lib/public-assets';

describe('authentication security helpers', () => {
  it('reads only the requested cookie', () => {
    const header = 'first=value; book-studio-target=secure%20value';

    assert.equal(getCookieValue(header, 'book-studio-target'), 'secure value');
    assert.equal(getCookieValue(header, 'missing'), undefined);
  });

  it('creates distinct opaque tokens and stable hashes', () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    assert.equal(isOpaqueToken(first), true);
    assert.equal(isOpaqueToken(second), true);
    assert.notEqual(first, second);
    assert.match(hashOpaqueToken(first), /^[0-9a-f]{64}$/);
    assert.equal(hashOpaqueToken(first), hashOpaqueToken(first));
  });

  it('bypasses passkey authentication only in development', () => {
    assert.equal(isDevelopmentAuthBypass('development'), true);
    assert.equal(isDevelopmentAuthBypass('production'), false);
    assert.equal(isDevelopmentAuthBypass('test'), false);
  });

  it('keeps authentication state out of unrelated cookies', () => {
    const header = 'book-studio-session=value; unrelated=other';

    assert.equal(getCookieValue(header, 'book-studio-session'), 'value');
    assert.equal(getCookieValue(header, 'missing'), undefined);
  });

  it('does not accept malformed encoded cookie values', () => {
    assert.equal(
      getCookieValue('book-studio-session=%E0%A4%A', 'book-studio-session'),
      undefined,
    );
  });

  it('rejects legacy JWT and malformed opaque tokens', () => {
    assert.equal(isOpaqueToken('header.payload.signature'), false);
    assert.equal(isOpaqueToken('short'), false);
    assert.equal(isOpaqueToken(`${createOpaqueToken()}.`), false);
  });

  it('derives the WebAuthn origin and RP ID from SITE_URL', () => {
    assert.deepEqual(getAuthEnv('https://books.example.com'), {
      origin: 'https://books.example.com',
      rpId: 'books.example.com',
    });
    assert.throws(() => getAuthEnv('http://books.example.com'));
    assert.throws(() => getAuthEnv('https://books.example.com/docs'));
  });

  it('compares a sufficiently long owner setup token', () => {
    const configuredToken = 'a-secure-owner-setup-token-over-32-bytes';

    assert.equal(
      isValidOwnerSetupToken({ candidate: configuredToken, configuredToken }),
      true,
    );
    assert.equal(
      isValidOwnerSetupToken({
        candidate: 'a-different-owner-setup-token-over-32-bytes',
        configuredToken,
      }),
      false,
    );
    assert.throws(() =>
      isValidOwnerSetupToken({ candidate: 'short', configuredToken: 'short' }),
    );
  });

  it('requests owner verification for the stored credential', async () => {
    const options = await createAuthenticationOptions({
      credentialId: 'credential-id',
      rpId: 'books.example.com',
    });

    assert.equal(options.userVerification, 'required');
    assert.deepEqual(options.allowCredentials, [
      { id: 'credential-id', type: 'public-key' },
    ]);
  });

  it('creates owner registration options without attestation', async () => {
    const options = await createRegistrationOptions({
      rpId: 'books.example.com',
    });

    assert.equal(options.rp.id, 'books.example.com');
    assert.equal(options.attestation, 'none');
    assert.equal(options.authenticatorSelection?.residentKey, 'preferred');
    assert.equal(options.authenticatorSelection?.userVerification, 'required');
  });

  it('keeps challenge and session lifetimes fixed', () => {
    assert.equal(CHALLENGE_EXPIRES_SECONDS, 5 * 60);
    assert.equal(SESSION_EXPIRES_SECONDS, 30 * 24 * 60 * 60);
  });

  it('binds public asset signatures to their DB-backed page secret', () => {
    const assetSecret = 'page-specific-secret';
    const contentDigest = getPublicAssetContentDigest({ content: 'content' });
    const pageUrl = '/docs/book/page';
    const url = new URL(
      getPublicAssetUrl({
        assetSecret,
        contentDigest,
        pageUrl,
        sourceUrl: '/books/book/image.png',
      }),
      'https://books.example.com',
    );
    const [, , signature, ...path] = url.pathname.split('/');

    assert.equal(
      hasValidPublicAssetSignature({
        assetSecret,
        contentDigest,
        pageUrl,
        path,
        signature,
      }),
      true,
    );
    assert.equal(
      hasValidPublicAssetSignature({
        assetSecret: 'different-secret',
        contentDigest,
        pageUrl,
        path,
        signature,
      }),
      false,
    );
  });
});
