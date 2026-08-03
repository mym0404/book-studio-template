import { z } from 'zod';

export const CHALLENGE_PURPOSES = ['authentication', 'registration'] as const;

export const challengePurposeSchema = z.enum(CHALLENGE_PURPOSES);

export type ChallengePurpose = z.infer<typeof challengePurposeSchema>;

export const passkeyModeSchema = z.enum(['authentication', 'setup']);

export type PasskeyMode = z.infer<typeof passkeyModeSchema>;

const publicKeyCredentialTypeSchema = z.literal('public-key');
const authenticatorAttachmentSchema = z.enum(['cross-platform', 'platform']);
const authenticatorTransportSchema = z.enum([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);
const userVerificationSchema = z.enum(['discouraged', 'preferred', 'required']);
const publicKeyCredentialHintSchema = z.enum([
  'hybrid',
  'security-key',
  'client-device',
]);

const credentialDescriptorSchema = z.looseObject({
  id: z.string(),
  transports: z.array(authenticatorTransportSchema).optional(),
  type: publicKeyCredentialTypeSchema,
});

const authenticationExtensionsClientInputsSchema = z.looseObject({
  appid: z.string().optional(),
  credProps: z.boolean().optional(),
  hmacCreateSecret: z.boolean().optional(),
  minPinLength: z.boolean().optional(),
});

const authenticationExtensionsClientOutputsSchema = z.looseObject({
  appid: z.boolean().optional(),
  credProps: z
    .looseObject({
      rk: z.boolean().optional(),
    })
    .optional(),
  hmacCreateSecret: z.boolean().optional(),
});

const publicKeyCredentialRequestOptionsSchema = z.looseObject({
  allowCredentials: z.array(credentialDescriptorSchema).optional(),
  challenge: z.string(),
  extensions: authenticationExtensionsClientInputsSchema.optional(),
  hints: z.array(publicKeyCredentialHintSchema).optional(),
  rpId: z.string().optional(),
  timeout: z.number().optional(),
  userVerification: userVerificationSchema.optional(),
});

const publicKeyCredentialCreationOptionsSchema = z.looseObject({
  attestation: z.enum(['direct', 'enterprise', 'indirect', 'none']).optional(),
  attestationFormats: z
    .array(
      z.enum([
        'fido-u2f',
        'packed',
        'android-safetynet',
        'android-key',
        'tpm',
        'apple',
        'none',
      ]),
    )
    .optional(),
  authenticatorSelection: z
    .looseObject({
      authenticatorAttachment: authenticatorAttachmentSchema.optional(),
      requireResidentKey: z.boolean().optional(),
      residentKey: z.enum(['discouraged', 'preferred', 'required']).optional(),
      userVerification: userVerificationSchema.optional(),
    })
    .optional(),
  challenge: z.string(),
  excludeCredentials: z.array(credentialDescriptorSchema).optional(),
  extensions: authenticationExtensionsClientInputsSchema.optional(),
  hints: z.array(publicKeyCredentialHintSchema).optional(),
  pubKeyCredParams: z.array(
    z.looseObject({
      alg: z.number(),
      type: publicKeyCredentialTypeSchema,
    }),
  ),
  rp: z.looseObject({
    id: z.string().optional(),
    name: z.string(),
  }),
  timeout: z.number().optional(),
  user: z.looseObject({
    displayName: z.string(),
    id: z.string(),
    name: z.string(),
  }),
});

export const authenticationResponseSchema = z.looseObject({
  authenticatorAttachment: authenticatorAttachmentSchema.optional(),
  clientExtensionResults: authenticationExtensionsClientOutputsSchema,
  id: z.string(),
  rawId: z.string(),
  response: z.looseObject({
    authenticatorData: z.string(),
    clientDataJSON: z.string(),
    signature: z.string(),
    userHandle: z.string().optional(),
  }),
  type: publicKeyCredentialTypeSchema,
});

export const registrationResponseSchema = z.looseObject({
  authenticatorAttachment: authenticatorAttachmentSchema.optional(),
  clientExtensionResults: authenticationExtensionsClientOutputsSchema,
  id: z.string(),
  rawId: z.string(),
  response: z.looseObject({
    attestationObject: z.string(),
    authenticatorData: z.string().optional(),
    clientDataJSON: z.string(),
    publicKey: z.string().optional(),
    publicKeyAlgorithm: z.number().optional(),
    transports: z.array(authenticatorTransportSchema).optional(),
  }),
  type: publicKeyCredentialTypeSchema,
});

export const passkeyModeResponseSchema = z.object({
  mode: passkeyModeSchema,
});

export const passkeyOptionsResponseSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('authentication'),
    options: publicKeyCredentialRequestOptionsSchema,
  }),
  z.object({
    mode: z.literal('setup'),
    options: publicKeyCredentialCreationOptionsSchema,
  }),
]);

export const passkeyRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('options'),
    setupToken: z.string().optional(),
  }),
  z.object({
    action: z.literal('verify'),
    response: z.unknown(),
  }),
]);
