import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const opaqueTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const createOpaqueToken = () => randomBytes(32).toString('base64url');

export const hashOpaqueToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
