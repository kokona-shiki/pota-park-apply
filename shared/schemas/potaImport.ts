import { z } from 'zod';
import { createApiResponseSchema } from './common.js';

export const ImportTaskResultSummarySchema = z.object({
  total: z.number(),
  imported: z.number(),
  skipped: z.number(),
  errors: z.number(),
  needsManual: z.number(),
});

export const ImportTaskSchema = z.object({
  id: z.string(),
  status: z.union([
    z.literal('pending'),
    z.literal('running'),
    z.literal('success'),
    z.literal('partial_success'),
    z.literal('failed'),
  ]),
  operationType: z.union([z.literal('manual'), z.literal('auto')]),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  queuePosition: z.number(),
  result: ImportTaskResultSummarySchema.nullable(),
  error: z.string().nullable(),
  readAt: z.string().nullable(),
});

export const PotaImportStatusDataSchema = z.object({
  canImport: z.boolean(),
  hasImportPermission: z.boolean(),
  hasSyncPermission: z.boolean(),
});

export const PotaImportLatestTaskDataSchema = ImportTaskSchema.nullable();

export const PotaImportTriggerDataSchema = z.object({
  task: ImportTaskSchema.optional(),
  message: z.string().optional(),
});

export const PotaImportMarkReadDataSchema = ImportTaskSchema.nullable();

export const PotaImportStatusResponseSchema = createApiResponseSchema(PotaImportStatusDataSchema);
export const PotaImportLatestTaskResponseSchema = createApiResponseSchema(
  PotaImportLatestTaskDataSchema
);
export const PotaImportTriggerResponseSchema = createApiResponseSchema(PotaImportTriggerDataSchema);
export const PotaImportMarkReadResponseSchema = createApiResponseSchema(
  PotaImportMarkReadDataSchema
);
