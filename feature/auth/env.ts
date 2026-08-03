import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const requiredEnvironmentVariableSchema = z.string().trim().min(1);

const siteUrlSchema = z
  .url({ error: 'SITE_URL must be an HTTPS origin' })
  .refine(
    (siteUrl) => {
      const parsedUrl = new URL(siteUrl);

      return (
        parsedUrl.protocol === 'https:' &&
        !parsedUrl.username &&
        !parsedUrl.password &&
        parsedUrl.pathname === '/' &&
        !parsedUrl.search &&
        !parsedUrl.hash
      );
    },
    { error: 'SITE_URL must be an HTTPS origin' },
  );

const ownerSetupTokenSchema = z
  .string()
  .refine((token) => Buffer.byteLength(token) >= 32, {
    error: 'OWNER_SETUP_TOKEN must be at least 32 bytes',
  });

const readRequiredEnv = (name: string) => {
  return requiredEnvironmentVariableSchema.parse(process.env[name], {
    error: () => `Missing required environment variable: ${name}`,
  });
};

/** Derives both WebAuthn identifiers from the canonical HTTPS SITE_URL origin. */
export const getAuthEnv = (siteUrl = readRequiredEnv('SITE_URL')) => {
  const parsedUrl = new URL(siteUrlSchema.parse(siteUrl));

  return {
    origin: parsedUrl.origin,
    rpId: parsedUrl.hostname,
  };
};

export const isValidOwnerSetupToken = ({
  candidate,
  configuredToken = readRequiredEnv('OWNER_SETUP_TOKEN'),
}: {
  candidate: string;
  configuredToken?: string;
}) => {
  const validConfiguredToken = ownerSetupTokenSchema.parse(configuredToken);

  const configuredHash = createHash('sha256')
    .update(validConfiguredToken)
    .digest();
  const candidateHash = createHash('sha256').update(candidate.trim()).digest();

  return timingSafeEqual(candidateHash, configuredHash);
};

export const isDevelopmentAuthBypass = (nodeEnv = process.env.NODE_ENV) =>
  nodeEnv === 'development';
