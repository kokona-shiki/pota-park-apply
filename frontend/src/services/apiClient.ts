import axios, { type AxiosResponse } from 'axios';
import { z } from 'zod';

export const apiClient = axios.create({
  withCredentials: true,
});

export const parseApiData = <T>(schema: z.ZodType<T>, data: unknown): T => {
  return schema.parse(data);
};

export const requestWithSchema = async <T>(
  request: Promise<AxiosResponse<unknown>>,
  schema: z.ZodType<T>
): Promise<T> => {
  const response = await request;
  return parseApiData(schema, response.data);
};
