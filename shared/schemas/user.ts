import { z } from 'zod';
import { createApiResponseSchema } from './common';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email().nullable().optional(),
  callsign: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  last_login: z.string().nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const UserAdminAuditLogSchema = z.object({
  id: z.number(),
  action: z.union([
    z.literal('user_role_changed'),
    z.literal('user_disabled'),
    z.literal('user_enabled'),
    z.literal('refresh_token_reuse_detected'),
  ]),
  operator_id: z.number().nullable(),
  target_user_id: z.number().nullable(),
  old_role: z.string().nullable(),
  new_role: z.string().nullable(),
  old_is_active: z.boolean().nullable(),
  new_is_active: z.boolean().nullable(),
  reason: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: z.string(),
  operator_callsign: z.string().nullable().optional(),
  operator_email: z.string().nullable().optional(),
  target_callsign: z.string().nullable().optional(),
  target_email: z.string().nullable().optional(),
});

export type UserAdminAuditLog = z.infer<typeof UserAdminAuditLogSchema>;

export const UsersDataSchema = z.object({
  users: z.array(UserSchema).optional(),
});

export const UserAdminAuditLogsDataSchema = z.object({
  logs: z.array(UserAdminAuditLogSchema).optional(),
});

export const UserUpdateDataSchema = z.object({
  user: UserSchema,
});

export const UsersResponseSchema = createApiResponseSchema(UsersDataSchema);
export const UserAdminAuditLogsResponseSchema = createApiResponseSchema(UserAdminAuditLogsDataSchema);
export const UserUpdateResponseSchema = createApiResponseSchema(UserUpdateDataSchema);
