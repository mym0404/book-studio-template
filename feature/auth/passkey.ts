import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  CHALLENGE_EXPIRES_SECONDS,
  SESSION_EXPIRES_SECONDS,
} from '@/feature/auth/constants';
import { getAuthEnv, isValidOwnerSetupToken } from '@/feature/auth/env';
import {
  authenticationResponseSchema,
  type ChallengePurpose,
  type PasskeyMode,
  registrationResponseSchema,
} from '@/feature/auth/passkey-schema';
import {
  consumeChallenge,
  getOwnerCredential,
  registerOwnerAndCreateSession,
  storeChallenge,
  updateCounterAndCreateSession,
} from '@/feature/auth/repositories/auth';
import {
  createOpaqueToken,
  hashOpaqueToken,
  opaqueTokenSchema,
} from '@/feature/auth/tokens';

type PasskeyVerificationResult =
  | { status: 'conflict' | 'unauthorized' }
  | { sessionToken: string; status: 'verified' };

export const createAuthenticationOptions = async ({
  credentialId,
  rpId,
}: {
  credentialId: string;
  rpId: string;
}) =>
  generateAuthenticationOptions({
    allowCredentials: [{ id: credentialId }],
    rpID: rpId,
    userVerification: 'required',
  });

export const createRegistrationOptions = async ({ rpId }: { rpId: string }) =>
  generateRegistrationOptions({
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    rpID: rpId,
    rpName: 'Book Studio',
    userDisplayName: 'Book Studio Owner',
    userName: 'owner',
  });

export const getPasskeyMode = async (): Promise<PasskeyMode> =>
  (await getOwnerCredential()) ? 'authentication' : 'setup';

const storePasskeyChallenge = async ({
  challenge,
  purpose,
}: {
  challenge: string;
  purpose: ChallengePurpose;
}) => {
  const challengeToken = createOpaqueToken();

  await storeChallenge({
    challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_EXPIRES_SECONDS * 1000),
    purpose,
    tokenHash: hashOpaqueToken(challengeToken),
  });

  return challengeToken;
};

export const createPasskeyOptions = async ({
  setupToken,
}: {
  setupToken?: string;
}) => {
  const credential = await getOwnerCredential();
  const { rpId } = getAuthEnv();

  if (credential) {
    const options = await createAuthenticationOptions({
      credentialId: credential.credentialId,
      rpId,
    });

    return {
      challengeToken: await storePasskeyChallenge({
        challenge: options.challenge,
        purpose: 'authentication',
      }),
      mode: 'authentication' as const,
      options,
    };
  }

  if (
    setupToken === undefined ||
    !isValidOwnerSetupToken({ candidate: setupToken })
  ) {
    return undefined;
  }

  const options = await createRegistrationOptions({ rpId });

  return {
    challengeToken: await storePasskeyChallenge({
      challenge: options.challenge,
      purpose: 'registration',
    }),
    mode: 'setup' as const,
    options,
  };
};

const createSessionDetails = () => {
  const sessionToken = createOpaqueToken();

  return {
    expiresAt: new Date(Date.now() + SESSION_EXPIRES_SECONDS * 1000),
    sessionToken,
    tokenHash: hashOpaqueToken(sessionToken),
  };
};

const verifyRegistration = async ({
  challenge,
  response,
}: {
  challenge: string;
  response: unknown;
}): Promise<PasskeyVerificationResult> => {
  const responseResult = registrationResponseSchema.safeParse(response);
  if (!responseResult.success) return { status: 'unauthorized' };

  const { origin, rpId } = getAuthEnv();
  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
      response: responseResult.data,
    });
  } catch {
    return { status: 'unauthorized' };
  }

  if (!verification.verified || !verification.registrationInfo.userVerified) {
    return { status: 'unauthorized' };
  }

  const session = createSessionDetails();
  const credential = verification.registrationInfo.credential;
  const created = await registerOwnerAndCreateSession({
    counter: credential.counter,
    credentialId: credential.id,
    expiresAt: session.expiresAt,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    tokenHash: session.tokenHash,
  });

  return created
    ? { sessionToken: session.sessionToken, status: 'verified' }
    : { status: 'conflict' };
};

const verifyAuthentication = async ({
  challenge,
  response,
}: {
  challenge: string;
  response: unknown;
}): Promise<PasskeyVerificationResult> => {
  const responseResult = authenticationResponseSchema.safeParse(response);
  if (!responseResult.success) return { status: 'unauthorized' };

  const credential = await getOwnerCredential();
  if (!credential) return { status: 'conflict' };
  if (responseResult.data.id !== credential.credentialId) {
    return { status: 'unauthorized' };
  }

  const { origin, rpId } = getAuthEnv();
  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;

  try {
    verification = await verifyAuthenticationResponse({
      credential: {
        counter: credential.counter,
        id: credential.credentialId,
        publicKey: Uint8Array.from(
          Buffer.from(credential.publicKey, 'base64url'),
        ),
      },
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
      response: responseResult.data,
    });
  } catch {
    return { status: 'unauthorized' };
  }

  if (
    !verification.verified ||
    !verification.authenticationInfo.userVerified ||
    verification.authenticationInfo.credentialID !== credential.credentialId
  ) {
    return { status: 'unauthorized' };
  }

  const session = createSessionDetails();
  const created = await updateCounterAndCreateSession({
    credentialId: credential.credentialId,
    expectedCounter: credential.counter,
    expiresAt: session.expiresAt,
    newCounter: verification.authenticationInfo.newCounter,
    tokenHash: session.tokenHash,
  });

  return created
    ? { sessionToken: session.sessionToken, status: 'verified' }
    : { status: 'conflict' };
};

/** Consumes the challenge before verification so neither success nor failure can replay it. */
export const verifyOwnerPasskey = async ({
  challengeToken,
  response,
}: {
  challengeToken: string;
  response: unknown;
}): Promise<PasskeyVerificationResult> => {
  if (!opaqueTokenSchema.safeParse(challengeToken).success) {
    return { status: 'unauthorized' };
  }

  const challenge = await consumeChallenge({
    tokenHash: hashOpaqueToken(challengeToken),
  });

  if (!challenge) return { status: 'unauthorized' };

  return challenge.purpose === 'registration'
    ? verifyRegistration({ challenge: challenge.challenge, response })
    : verifyAuthentication({ challenge: challenge.challenge, response });
};
