import axios, { type AxiosResponse } from 'axios';
import { z } from 'zod';

// 定义日志级别
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// 定义日志选项接口
interface LogOptions {
  level: LogLevel;
  message: string;
  error?: unknown;
  metadata?: unknown;
  request?: unknown;
  response?: unknown;
}

/**
 * 日志记录函数
 */
export function log({ level, message, error, metadata, request, response }: LogOptions): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case LogLevel.WARN:
      console.warn(logMessage, error, metadata, request, response);
      break;
    case LogLevel.ERROR:
      console.error(logMessage, error, metadata, request, response);
      break;
    case LogLevel.FATAL:
      console.error(logMessage, error, metadata, request, response);
      break;
    default:
      console.warn(logMessage, error, metadata, request, response);
  }
}

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
  const businessError = error as Error & { 
    isBusinessError: boolean; 
    response: unknown;
    code?: string;
  };
  businessError.isBusinessError = true;
  businessError.response = response;
  
  // 提取错误代码
  if (response && typeof response === 'object') {
    const responseObj = response as { data?: unknown };
    const responseData = responseObj.data;
    if (responseData && typeof responseData === 'object') {
      const dataObj = responseData as { code?: string };
      businessError.code = dataObj.code;
    }
  }
  
  throw businessError;
};

// 处理 Zod 验证错误
const handleZodError = (error: unknown, responseData: unknown): never => {
  if (error instanceof z.ZodError) {
    log({
      level: LogLevel.ERROR,
      message: 'Zod validation error',
      error: error.issues,
      metadata: responseData
    });
    
    // 如果是 Zod 验证错误，检查是否是因为响应格式不符合预期
    if (typeof responseData === 'object' && responseData !== null) {
      const apiResponse = responseData as { code: string | number; message: string };
      // 如果有 code 字段，可能是业务错误被错误地用 schema 解析了
      if ('code' in apiResponse && typeof apiResponse.code === 'string') {
        // 重新抛出业务错误，保留完整响应数据
        const bizError = new Error(apiResponse.message || '业务错误');
        const businessError = bizError as Error & { 
          isBusinessError: boolean;
          code?: string;
        };
        businessError.isBusinessError = true;
        businessError.code = apiResponse.code;
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
  let response: AxiosResponse<unknown> | undefined;
  
  try {
    response = await request;
    responseData = response.data;
    
    if (typeof responseData === 'object' && responseData !== null) {
      const apiResponse = responseData as { code: string | number; message: string; data: unknown };
      
      if ('code' in apiResponse) {
        const isErrorCode = 
          (typeof apiResponse.code === 'number' && apiResponse.code !== 0) ||
          (typeof apiResponse.code === 'string' && apiResponse.code.trim() !== '');
        
        if (isErrorCode) {
          log({
            level: LogLevel.WARN,
            message: 'API business error',
            error: apiResponse,
            response
          });
          
          handleBusinessError(apiResponse.message, response);
        }
        return parseApiData(schema, apiResponse.data);
      }
    }
    
    return parseApiData(schema, responseData);
  } catch (error) {
    log({
      level: LogLevel.ERROR,
      message: 'API request error',
      error,
      metadata: responseData,
      response
    });
    
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
    default:
      request = apiClient.get(url, { params });
  }

  try {
    const response = await request;
    return response.data as ApiResponse<T>;
  } catch (error) {
    // 记录错误日志
    log({
      level: LogLevel.ERROR,
      message: 'API fetch error',
      error,
      metadata: { url, method, body, params }
    });
    throw error;
  }
};
