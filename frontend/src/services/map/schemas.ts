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

export const TiandituPoiItemSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  lon: z.string(),
  lat: z.string(),
});

export const TiandituPoiResponseSchema = z.object({
  status: z.string(),
  resultType: z.number().optional(),
  pois: z.array(TiandituPoiItemSchema).optional(),
  count: z.number().optional(),
});

export const TiandituGeocoderResultSchema = z.object({
  formatted_address: z.string().optional(),
  addressComponent: z.object({
    province: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
});

export const TiandituGeocoderResponseSchema = z.object({
  status: z.string(),
  msg: z.string().optional(),
  result: TiandituGeocoderResultSchema.optional(),
});
