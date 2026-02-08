import { z } from 'zod';

export const OsmGeocodeItemSchema = z.object({
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
  boundingbox: z.array(z.string()).length(4).optional(),
});

export const OsmReverseSchema = z.object({
  display_name: z.string(),
  address: z.record(z.string(), z.string()).optional(),
});
