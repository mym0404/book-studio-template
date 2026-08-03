import { createHash, timingSafeEqual } from 'node:crypto';

const readRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

/** Derives both WebAuthn identifiers from the canonical HTTPS SITE_URL origin. */
export const getAuthEnv = (siteUrl = readRequiredEnv('SITE_URL')) => {
  const parsedUrl = new URL(siteUrl);

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('SITE_URL must be an HTTPS origin');
  }

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
  if (Buffer.byteLength(configuredToken) < 32) {
    throw new Error('OWNER_SETUP_TOKEN must be at least 32 bytes');
  }

  const configuredHash = createHash('sha256').update(configuredToken).digest();
  const candidateHash = createHash('sha256').update(candidate.trim()).digest();

  return timingSafeEqual(candidateHash, configuredHash);
};

export const isDevelopmentAuthBypass = (nodeEnv = process.env.NODE_ENV) =>
  nodeEnv === 'development';
