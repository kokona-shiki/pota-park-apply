import { z } from 'zod';
import { createApiResponseSchema } from './common.js';

export const ApplicationStatusSchema = z.union([
  z.literal('pending'),
  z.literal('approved'),
  z.literal('rejected'),
  z.literal('pota_synced'),
]);

export const ParkApplicationSchema = z.object({
  id: z.number(),
  park_name: z.string(),
  province_name: z.string(),
  provinces: z.array(z.string()),
  status: ApplicationStatusSchema,
  created_at: z.string(),
  applicant_callsign: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).nullable().optional(),
  longitude: z.union([z.number(), z.string()]).nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  pota_notes: z.string().nullable().optional(),
  pota_synced_at: z.string().nullable().optional(),
});

export const ParkApplicationDetailSchema = ParkApplicationSchema.extend({
  park_type: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const ParkApplicationDetailPartialSchema = ParkApplicationDetailSchema.partial();

export const ParkApplicationSubmitRequestSchema = z.object({
  park_name: z.string().min(1),
  park_type: z.string().min(1).optional(),
  provinces: z.array(z.string()).min(1),
  latitude: z.number(),
  longitude: z.number(),
  website: z.string().optional(),
  access_methods: z.array(z.string()).min(1),
  activation_methods: z.array(z.string()).min(1),
  confirmed_authenticity: z.boolean(),
  confirmedNameSimilarity: z.boolean().optional(),
  confirmedNearbyLocation: z.boolean().optional(),
});

export const AuditLogSchema = z.object({
  id: z.number(),
  action: z.string(),
  operator_email: z.string(),
  operator_callsign: z.string(),
  operator_role: z.string(),
  old_status: z.string().nullable(),
  new_status: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export type ParkApplication = z.infer<typeof ParkApplicationSchema>;
export type ParkApplicationDetail = z.infer<typeof ParkApplicationDetailSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ApplicationsDataSchema = z.object({
  applications: z.array(ParkApplicationSchema).optional(),
});

export const ApplicationDetailDataSchema = z.object({
  application: ParkApplicationDetailSchema.nullable().optional(),
});

export const ApplicationAuditLogsDataSchema = z.object({
  logs: z.array(AuditLogSchema).optional(),
});

export const ApplicationsResponseSchema = createApiResponseSchema(ApplicationsDataSchema);
export const ApplicationDetailResponseSchema = createApiResponseSchema(ApplicationDetailDataSchema);
export const ApplicationAuditLogsResponseSchema =
  createApiResponseSchema(ApplicationAuditLogsDataSchema);
