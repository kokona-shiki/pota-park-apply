import { z } from 'zod';
import { createApiResponseSchema } from './common.js';

export const AuthUserSchema = z.object({
  id: z.number(),
  email: z.email().nullable().optional(),
  callsign: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const RegisterRequestSchema = z.object({
  email: z.email(),
  callsign: z.string().min(1),
  password: z.string().min(1),
  verificationCode: z.string().length(6),
});

export const AuthPayloadSchema = z.object({
  accessToken: z.string(),
  user: AuthUserSchema,
});

export const UserInfoDataSchema = z.object({
  user: AuthUserSchema,
});

export const UserPermissionsDataSchema = z.object({
  permissions: z.array(z.string()),
});

export const LoginResponseSchema = createApiResponseSchema(AuthPayloadSchema);
export const RefreshTokenResponseSchema = createApiResponseSchema(AuthPayloadSchema);
export const UserInfoResponseSchema = createApiResponseSchema(UserInfoDataSchema);
export const UserPermissionsResponseSchema = createApiResponseSchema(UserPermissionsDataSchema);
