import { z } from 'zod';
import { PaginationSchema, createApiResponseSchema } from './common';

export const PotaStatusSchema = z.object({
  connected: z.boolean(),
  expiresAt: z.string().nullable(),
  willExpireSoon: z.boolean().optional(),
});

export const PotaStatusDataSchema = PotaStatusSchema;

export const PotaAuthInitDataSchema = z.object({
  authUrl: z.url(),
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
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const PotaSyncLogSchema = z.object({
  id: z.number(),
  operator: z.string(),
  operationType: z.union([z.literal('auto'), z.literal('manual')]),
  syncDate: z.string(),
  parksImported: z.array(PotaSyncLogParkSchema),
  status: z.union([z.literal('success'), z.literal('partial_success'), z.literal('failed')]),
  details: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const PotaSyncLogsDataSchema = z.object({
  logs: z.array(PotaSyncLogSchema),
  pagination: PaginationSchema,
});

export const PotaSyncLogsResponseSchema = createApiResponseSchema(PotaSyncLogsDataSchema);


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
  park: z.record(z.string(), z.unknown()).optional(),
});

export const PotaUnprocessedParkBulkProcessResultSchema = z.object({
  results: z.array(PotaUnprocessedParkProcessResultSchema),
  successCount: z.number(),
  failCount: z.number(),
});

export const CheckPermissionResponseSchema = z.object({
  hasPermission: z.boolean(),
});

// 公园类型不一致相关 Schema
export const ParkTypeMismatchSchema = z.object({
  id: z.number(),
  park_name: z.string(),
  system_park_type_id: z.string(),
  system_park_type_chinese: z.string(),
  system_park_type_english: z.string(),
  pota_park_type: z.string(),
});

export const ParkTypeMismatchesDataSchema = z.array(ParkTypeMismatchSchema);

export const BulkUpdateParkTypeItemSchema = z.object({
  parkId: z.number(),
  newParkTypeId: z.string(),
});

export const BulkUpdateParkTypeRequestSchema = z.object({
  updates: z.array(BulkUpdateParkTypeItemSchema),
});

export const BulkUpdateParkTypeResultItemSchema = z.object({
  parkId: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const BulkUpdateParkTypeResultSchema = z.object({
  results: z.array(BulkUpdateParkTypeResultItemSchema),
  successCount: z.number(),
  failCount: z.number(),
});

export const PotaStatusResponseSchema = createApiResponseSchema(PotaStatusDataSchema);
export const PotaAuthInitResponseSchema = createApiResponseSchema(PotaAuthInitDataSchema);
export const PotaUnprocessedParksResponseSchema = createApiResponseSchema(
  PotaUnprocessedParksDataSchema
);
export const ParkTypeMismatchesResponseSchema = createApiResponseSchema(
  ParkTypeMismatchesDataSchema
);
export const BulkUpdateParkTypeResponseSchema = createApiResponseSchema(
  BulkUpdateParkTypeResultSchema
);
