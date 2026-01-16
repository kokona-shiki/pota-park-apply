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
  let responseData: unknown;
  try {
    const response = await request;
    responseData = response.data;
    return parseApiData(schema, responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', {
        errors: error.issues,
        responseData: responseData,
        schema: schema.toString()
      });
    }
    throw error;
  }
};
