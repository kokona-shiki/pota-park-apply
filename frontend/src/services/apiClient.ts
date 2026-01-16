import axios, { type AxiosResponse } from 'axios';
import { z } from 'zod';

export const apiClient = axios.create({
  withCredentials: true,
});

// Define API response type for type safety
export type ApiResponse<T> = {
  code: number | string;
  message: string;
  data: T;
};

// Create a Zod schema for API response
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    code: z.union([z.number(), z.string()]),
    message: z.string(),
    data: dataSchema,
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
    
    // Parse the response data directly with the provided schema
    // This handles both API response structure and direct data response
    // because the schema already includes the API response structure if needed
    return parseApiData(schema, responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', error.issues);
    }
    throw error;
  }
};
