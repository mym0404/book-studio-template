import { z } from 'zod';
import {
  type ChallengePurpose,
  challengePurposeSchema,
} from '@/feature/auth/passkey-schema';
import { getDatabase } from '@/feature/common/database';

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const ownerCredentialRowSchema = z.object({
  counter: z.string().regex(/^\d+$/),
  credential_id: z.string().regex(BASE64URL_PATTERN),
  public_key: z.string().regex(BASE64URL_PATTERN),
});

const ownerCredentialSchema = z.object({
  counter: z.number().refine(Number.isSafeInteger),
  credentialId: z.string(),
  publicKey: z.string(),
});

export type OwnerCredential = z.infer<typeof ownerCredentialSchema>;

const challengeRowSchema = z.object({
  challenge: z.string(),
  purpose: challengePurposeSchema,
});

type ChallengeRow = z.infer<typeof challengeRowSchema>;

export const getOwnerCredential = async (): Promise<
  OwnerCredential | undefined
> => {
  const sql = getDatabase();
  const [row] = await sql`
    SELECT credential_id, public_key, counter::text AS counter
    FROM owner_auth
    WHERE id = 1
  `;

  if (row === undefined) return undefined;

  const rowResult = ownerCredentialRowSchema.safeParse(row);
  if (!rowResult.success) throw new Error('Invalid owner auth data');

  const credentialResult = ownerCredentialSchema.safeParse({
    counter: Number(rowResult.data.counter),
    credentialId: rowResult.data.credential_id,
    publicKey: rowResult.data.public_key,
  });
  if (!credentialResult.success) throw new Error('Invalid owner counter');

  return credentialResult.data;
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
  const sql = getDatabase();

  await sql.begin((transaction) => [
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
  const sql = getDatabase();
  const [row] = await sql`
    DELETE FROM auth_challenges
    WHERE token_hash = ${tokenHash}
      AND expires_at > CURRENT_TIMESTAMP
    RETURNING challenge, purpose
  `;

  if (row === undefined) return undefined;

  const result = challengeRowSchema.safeParse(row);
  if (!result.success) throw new Error('Invalid auth challenge data');

  return result.data;
};

export const hasStoredSession = async ({
  tokenHash,
}: {
  tokenHash: string;
}) => {
  const sql = getDatabase();
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
  const sql = getDatabase();
  const [, sessionRows] = await sql.begin((transaction) => [
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
  const sql = getDatabase();
  const [, sessionRows] = await sql.begin((transaction) => [
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
