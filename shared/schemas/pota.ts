import { z } from 'zod';
import { ApiCodeSchema, PaginationSchema, createApiResponseSchema } from './common';

export const PotaStatusSchema = z.object({
  connected: z.boolean(),
  expiresAt: z.string().nullable(),
  willExpireSoon: z.boolean().optional(),
});

export const PotaStatusDataSchema = PotaStatusSchema;

export const PotaAuthInitDataSchema = z.object({
  authUrl: z.string().url(),
  state: z.string(),
});

export const PotaAuthResultDataSchema = z.object({
  success: z.boolean(),
  expiresAt: z.string().optional(),
  hasRefreshToken: z.boolean().optional(),
});

export const PotaSyncLogParkSchema = z.object({
  reference: z.string(),
  name: z.string(),
  status: z.union([z.literal('success'), z.literal('failed'), z.literal('skipped')]),
  reason: z.string().optional(),
});

export const PotaSyncLogSchema = z.object({
  id: z.number(),
  operator: z.string(),
  operationType: z.union([z.literal('auto'), z.literal('manual')]),
  syncDate: z.string(),
  parksImported: z.array(PotaSyncLogParkSchema),
  status: z.union([z.literal('success'), z.literal('partial_success'), z.literal('failed')]),
  details: z.string(),
  createdAt: z.string(),
});

export const PotaSyncLogsPayloadSchema = z.object({
  code: ApiCodeSchema,
  message: z.string(),
  data: z.array(PotaSyncLogSchema),
  pagination: PaginationSchema,
});

export const PotaUnprocessedParkSchema = z.object({
  reference: z.string(),
  name: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  locationDesc: z.string(),
  grid: z.string(),
  attempts: z.number(),
  activations: z.number(),
  qsos: z.number(),
  message: z.string().optional(),
  failureReason: z.string().optional(),
  suggestedType: z.string().nullable().optional(),
  manualType: z.string().nullable().optional(),
});

export const PotaUnprocessedParksDataSchema = z.array(PotaUnprocessedParkSchema);

export const PotaUnprocessedParkProcessSchema = PotaUnprocessedParkSchema.extend({
  manualType: z.string(),
});

export const PotaUnprocessedParkProcessRequestSchema = z.object({
  parkData: PotaUnprocessedParkProcessSchema,
});

export const PotaUnprocessedParkBulkProcessRequestSchema = z.object({
  parksData: z.array(PotaUnprocessedParkProcessSchema),
});

export const PotaUnprocessedParkProcessResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  reference: z.string().optional(),
  park: z.record(z.unknown()).optional(),
});

export const PotaUnprocessedParkBulkProcessResultSchema = z.object({
  results: z.array(PotaUnprocessedParkProcessResultSchema),
  successCount: z.number(),
  failCount: z.number(),
});

export const CheckPermissionResponseSchema = z.object({
  hasPermission: z.boolean(),
});

export const PotaStatusResponseSchema = createApiResponseSchema(PotaStatusDataSchema);
export const PotaAuthInitResponseSchema = createApiResponseSchema(PotaAuthInitDataSchema);
export const PotaUnprocessedParksResponseSchema = createApiResponseSchema(
  PotaUnprocessedParksDataSchema
);
