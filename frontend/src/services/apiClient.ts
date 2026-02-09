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

// 处理业务错误
const handleBusinessError = (message: string | undefined, response: unknown) => {
  const error = new Error(message || '业务错误');
  const businessError = error as Error & { isBusinessError: boolean; response: unknown };
  businessError.isBusinessError = true;
  businessError.response = response;
  throw businessError;
};

// 处理 Zod 验证错误
const handleZodError = (error: unknown, responseData: unknown): never => {
  if (error instanceof z.ZodError) {
    console.error('Zod validation error:', error.issues);
    // 如果是 Zod 验证错误，检查是否是因为响应格式不符合预期
    if (typeof responseData === 'object' && responseData !== null) {
      const apiResponse = responseData as { code: string | number; message: string };
      // 如果有 code 字段，可能是业务错误被错误地用 schema 解析了
      if ('code' in apiResponse && typeof apiResponse.code === 'string') {
        // 重新抛出业务错误，保留完整响应数据
        const bizError = new Error(apiResponse.message || '业务错误');
        const businessError = bizError as Error & { isBusinessError: boolean };
        businessError.isBusinessError = true;
        throw businessError;
      }
    }
  }
  throw error;
};

export const requestWithSchema = async <T>(
  request: Promise<AxiosResponse<unknown>>,
  schema: z.ZodType<T>
): Promise<T> => {
  let responseData: unknown;
  try {
    const response = await request;
    responseData = response.data;
    
    // 检查是否为标准 API 响应格式
    if (typeof responseData === 'object' && responseData !== null) {
      const apiResponse = responseData as { code: string | number; message: string; data: unknown };
      
      // 如果有 code 字段，检查是否为错误
      if ('code' in apiResponse) {
        // 如果 code 是字符串且非空，说明是业务错误
        if (typeof apiResponse.code === 'string' && apiResponse.code.trim() !== '') {
          // 直接抛出业务错误，保留完整响应数据
          handleBusinessError(apiResponse.message, response);
        }
        // 否则是成功响应，解析 data 字段
        return parseApiData(schema, apiResponse.data);
      }
    }
    
    // 兼容旧格式：直接解析整个响应数据
    return parseApiData(schema, responseData);
  } catch (error) {
    handleZodError(error, responseData);
    throw error;
  }
};

export const fetchApi = async <T>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    params?: Record<string, unknown>;
  } = {}
): Promise<ApiResponse<T>> => {
  const { method = 'GET', body, params } = options;

  let request: Promise<AxiosResponse<unknown>>;

  switch (method) {
    case 'GET':
      request = apiClient.get(url, { params });
      break;
    case 'POST':
      request = apiClient.post(url, body);
      break;
    case 'PUT':
      request = apiClient.put(url, body);
      break;
    case 'DELETE':
      request = apiClient.delete(url);
      break;
  }

  const response = await request;
  return response.data as ApiResponse<T>;
};
