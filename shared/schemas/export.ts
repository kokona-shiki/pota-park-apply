import { z } from 'zod';
import { createApiResponseSchema } from './common.js';

export const ExportAuditLogSchema = z.object({
  id: z.number(),
  file_type: z.union([z.literal('csv'), z.literal('kmz')]),
  park_count: z.number(),
  exported_by_callsign: z.string().nullable().optional(),
  created_at: z.string(),
});

export type ExportAuditLog = z.infer<typeof ExportAuditLogSchema>;

export const ExportAuditLogsDataSchema = z.object({
  logs: z.array(ExportAuditLogSchema).optional(),
});

export const ExportAuditLogsResponseSchema = createApiResponseSchema(ExportAuditLogsDataSchema);
