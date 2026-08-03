import { createHash, randomBytes } from 'node:crypto';

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const createOpaqueToken = () => randomBytes(32).toString('base64url');

export const isOpaqueToken = (token: string) =>
  OPAQUE_TOKEN_PATTERN.test(token);

export const hashOpaqueToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
