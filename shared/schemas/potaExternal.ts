import { z } from 'zod';

export const PotaParkSchema = z.object({
  reference: z.string(),
  name: z.string(),
  grid: z.string().optional(),
  attempts: z.number().optional(),
  activations: z.number().optional(),
  qsos: z.number().optional(),
});

export const PotaLookupItemSchema = z.object({
  type: z.string(),
  id: z.number(),
  display: z.string(),
  value: z.string(),
});

export const PotaParkInfoSchema = z.object({
  parkId: z.number(),
  reference: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  grid4: z.string(),
  grid6: z.string(),
  parktypeId: z.number(),
  active: z.number(),
  parkComments: z.string(),
  accessibility: z.string().nullable(),
  sensitivity: z.string().nullable(),
  accessMethods: z.string(),
  activationMethods: z.string(),
  agencies: z.string().nullable(),
  agencyURLs: z.string().nullable(),
  parkURLs: z.string().nullable(),
  website: z.string(),
  createdByAdmin: z.string(),
  parktypeDesc: z.string(),
  locationDesc: z.string(),
  locationName: z.string(),
  entityId: z.number(),
  entityName: z.string(),
  referencePrefix: z.string(),
  entityDeleted: z.number(),
});
