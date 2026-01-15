import { z } from 'zod';

export const ApiCodeSchema = z.union([z.number(), z.string()]);

export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: ApiCodeSchema,
    message: z.string(),
    data: dataSchema,
  });

export type ApiResponse<T> = {
  code: number | string;
  message: string;
  data: T;
};

export const PaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
