import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/feature/common/database';

export type ChallengePurpose = 'authentication' | 'registration';

export type OwnerCredential = {
  counter: number;
  credentialId: string;
  publicKey: string;
};

type OwnerCredentialRow = {
  counter: string;
  credential_id: string;
  public_key: string;
};

type ChallengeRow = {
  challenge: string;
  purpose: ChallengePurpose;
};

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const isOwnerCredentialRow = (value: unknown): value is OwnerCredentialRow =>
  typeof value === 'object' &&
  value !== null &&
  'credential_id' in value &&
  typeof value.credential_id === 'string' &&
  BASE64URL_PATTERN.test(value.credential_id) &&
  'public_key' in value &&
  typeof value.public_key === 'string' &&
  BASE64URL_PATTERN.test(value.public_key) &&
  'counter' in value &&
  typeof value.counter === 'string' &&
  /^\d+$/.test(value.counter);

const isChallengeRow = (value: unknown): value is ChallengeRow =>
  typeof value === 'object' &&
  value !== null &&
  'challenge' in value &&
  typeof value.challenge === 'string' &&
  'purpose' in value &&
  (value.purpose === 'authentication' || value.purpose === 'registration');

export const getOwnerCredential = async (): Promise<
  OwnerCredential | undefined
> => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    SELECT credential_id, public_key, counter::text AS counter
    FROM owner_auth
    WHERE id = 1
  `;

  if (row === undefined) return undefined;
  if (!isOwnerCredentialRow(row)) throw new Error('Invalid owner auth data');

  const counter = Number(row.counter);
  if (!Number.isSafeInteger(counter)) throw new Error('Invalid owner counter');

  return {
    counter,
    credentialId: row.credential_id,
    publicKey: row.public_key,
  };
};

export const storeChallenge = async ({
  challenge,
  expiresAt,
  purpose,
  tokenHash,
}: {
  challenge: string;
  expiresAt: Date;
  purpose: ChallengePurpose;
  tokenHash: string;
}) => {
  const sql = neon(getDatabaseUrl());

  await sql.transaction((transaction) => [
    transaction`
      DELETE FROM auth_challenges
      WHERE expires_at <= CURRENT_TIMESTAMP
    `,
    transaction`
      INSERT INTO auth_challenges (token_hash, challenge, purpose, expires_at)
      VALUES (${tokenHash}, ${challenge}, ${purpose}, ${expiresAt.toISOString()})
    `,
  ]);
};

/** Deletes and returns a live challenge in one statement so every token is single-use. */
export const consumeChallenge = async ({
  tokenHash,
}: {
  tokenHash: string;
}): Promise<ChallengeRow | undefined> => {
  const sql = neon(getDatabaseUrl());
  const [row] = await sql`
    DELETE FROM auth_challenges
    WHERE token_hash = ${tokenHash}
      AND expires_at > CURRENT_TIMESTAMP
    RETURNING challenge, purpose
  `;

  if (row === undefined) return undefined;
  if (!isChallengeRow(row)) throw new Error('Invalid auth challenge data');

  return row;
};

export const hasStoredSession = async ({
  tokenHash,
}: {
  tokenHash: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT token_hash
    FROM auth_sessions
    WHERE token_hash = ${tokenHash}
      AND expires_at > CURRENT_TIMESTAMP
  `;

  return rows.length > 0;
};

/** Creates the first owner and its session atomically; a competing registration creates neither. */
export const registerOwnerAndCreateSession = async ({
  counter,
  credentialId,
  expiresAt,
  publicKey,
  tokenHash,
}: OwnerCredential & {
  expiresAt: Date;
  tokenHash: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const [, sessionRows] = await sql.transaction((transaction) => [
    transaction`
      DELETE FROM auth_sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
    `,
    transaction`
      WITH inserted_owner AS (
        INSERT INTO owner_auth (credential_id, public_key, counter)
        VALUES (${credentialId}, ${publicKey}, ${counter})
        ON CONFLICT DO NOTHING
        RETURNING id
      )
      INSERT INTO auth_sessions (token_hash, owner_id, expires_at)
      SELECT ${tokenHash}, id, ${expiresAt.toISOString()}
      FROM inserted_owner
      RETURNING token_hash
    `,
  ]);

  return sessionRows.length > 0;
};

/** Couples counter advancement and session creation to the same stored credential version. */
export const updateCounterAndCreateSession = async ({
  credentialId,
  expectedCounter,
  expiresAt,
  newCounter,
  tokenHash,
}: {
  credentialId: string;
  expectedCounter: number;
  expiresAt: Date;
  newCounter: number;
  tokenHash: string;
}) => {
  const sql = neon(getDatabaseUrl());
  const [, sessionRows] = await sql.transaction((transaction) => [
    transaction`
      DELETE FROM auth_sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
    `,
    transaction`
      WITH updated_owner AS (
        UPDATE owner_auth
        SET counter = ${newCounter}
        WHERE id = 1
          AND credential_id = ${credentialId}
          AND counter = ${expectedCounter}
        RETURNING id
      )
      INSERT INTO auth_sessions (token_hash, owner_id, expires_at)
      SELECT ${tokenHash}, id, ${expiresAt.toISOString()}
      FROM updated_owner
      RETURNING token_hash
    `,
  ]);

  return sessionRows.length > 0;
};
