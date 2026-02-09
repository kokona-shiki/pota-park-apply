import { Response } from 'express';

// 定义日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// 定义错误选项接口
interface ErrorOptions {
  bizCode?: string;
  bizMessage?: string;
  httpCode?: string;
  httpMessage?: string;
  logLevel?: LogLevel;
  logMessage?: string;
}

// 定义错误信息接口
interface ErrorInfo {
  status?: number;
  code?: string;
  message?: string;
  data?: unknown;
  details?: unknown;
  stack?: string;
}

// 定义日志接口
interface LogOptions {
  level: LogLevel;
  message: string;
  error?: unknown;
  metadata?: unknown;
  request?: unknown;
}

/**
 * 日志记录函数
 */
export function log({ level, message, error, metadata, request }: LogOptions): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(logMessage, error, metadata, request);
      break;
    case LogLevel.INFO:
      console.info(logMessage, error, metadata, request);
      break;
    case LogLevel.WARN:
      console.warn(logMessage, error, metadata, request);
      break;
    case LogLevel.ERROR:
      console.error(logMessage, error, metadata, request);
      break;
    case LogLevel.FATAL:
      console.error(logMessage, error, metadata, request);
      break;
    default:
      console.log(logMessage, error, metadata, request);
  }
}

/**
 * 发送成功响应
 */
export function sendOk(res: Response, data: unknown = null, message: string = 'ok'): Response {
  return res.json({ code: 0, message, data });
}

/**
 * 发送业务错误响应
 */
export function sendBizError(
  res: Response,
  code: string = 'BUSINESS_ERROR',
  message: string = '请求失败',
  data: unknown = null
): Response {
  return res.json({ code, message, data });
}

/**
 * 发送 HTTP 错误响应
 */
export function sendHttpError(
  res: Response,
  status: number = 400,
  code: string = 'REQUEST_ERROR',
  message: string = '请求失败',
  data: unknown = null
): Response {
  return res.status(status).json({ code, message, data });
}

/**
 * 根据 HTTP 状态码获取默认错误代码
 */
function defaultHttpCode(status: number): string {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REQUEST_ERROR';
}

/**
 * 根据 HTTP 状态码获取默认错误消息
 */
function defaultHttpMessage(status: number): string {
  if (status === 401) return '未授权';
  if (status === 403) return '权限不足';
  if (status === 404) return '未找到';
  if (status === 429) return '请求过于频繁，请稍后再试';
  if (status >= 500) return '服务器内部错误';
  return '请求失败';
}

/**
 * 统一错误输出：
 * - 401/403/429：保留 HTTP 状态码（鉴权/权限/限流）
 * - >=500：保留 HTTP 状态码（服务端错误）
 * - 其他：一律 HTTP 200，使用 code!=0 表达业务错误
 */
export function sendError(res: Response, err: unknown, options: ErrorOptions = {}): Response {
  const {
    bizCode = 'BUSINESS_ERROR',
    bizMessage = '请求失败',
    httpCode,
    httpMessage,
    logLevel = LogLevel.ERROR,
    logMessage = '请求处理失败',
  } = options;

  const errorInfo = extractErrorInfo(err);
  const responseData = buildResponseData(errorInfo);

  // 记录错误日志
  log({
    level: logLevel,
    message: logMessage,
    error: {
      message: errorInfo.message,
      code: errorInfo.code,
      stack: errorInfo.stack,
    },
    metadata: responseData,
    request: res.req,
  });

  if (isAuthError(errorInfo.status)) {
    return handleAuthError(res, errorInfo, { httpCode, httpMessage }, responseData);
  }

  if (isServerError(errorInfo.status)) {
    return handleServerError(res, errorInfo, { httpCode, httpMessage }, responseData);
  }

  return handleBusinessError(res, errorInfo, { bizCode, bizMessage }, responseData);
}

/**
 * 提取错误信息
 */
function extractErrorInfo(err: unknown): ErrorInfo {
  const error = err as Error & {
    status?: number;
    code?: string;
    data?: unknown;
    details?: unknown;
  };
  return {
    status: error?.status,
    code: error?.code,
    message: error?.message,
    data: error?.data ?? null,
    details: error?.details ?? null,
    stack: error?.stack,
  };
}

/**
 * 构建响应数据
 */
function buildResponseData(errorInfo: ErrorInfo): unknown {
  return errorInfo.details ? { details: errorInfo.details } : errorInfo.data;
}

/**
 * 检查是否为认证相关错误
 */
function isAuthError(status?: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

/**
 * 检查是否为服务器错误
 */
function isServerError(status?: number): boolean {
  return typeof status === 'number' && status >= 500;
}

/**
 * 处理认证相关错误
 */
function handleAuthError(
  res: Response,
  errorInfo: ErrorInfo,
  options: { httpCode?: string; httpMessage?: string },
  responseData: unknown
): Response {
  const { status, code, message } = errorInfo;
  const { httpCode, httpMessage } = options;
  const statusCode = status || 401;

  return sendHttpError(
    res,
    statusCode,
    code || httpCode || defaultHttpCode(statusCode),
    message || httpMessage || defaultHttpMessage(statusCode),
    responseData
  );
}

/**
 * 处理服务器错误
 */
function handleServerError(
  res: Response,
  errorInfo: ErrorInfo,
  options: { httpCode?: string; httpMessage?: string },
  responseData: unknown
): Response {
  const { status, code, message } = errorInfo;
  const { httpCode, httpMessage } = options;
  const statusCode = status || 500;

  return sendHttpError(
    res,
    statusCode,
    code || httpCode || defaultHttpCode(statusCode),
    message || httpMessage || defaultHttpMessage(statusCode),
    responseData
  );
}

/**
 * 处理业务错误
 */
function handleBusinessError(
  res: Response,
  errorInfo: ErrorInfo,
  options: { bizCode: string; bizMessage: string },
  responseData: unknown
): Response {
  const { code, message } = errorInfo;
  const { bizCode, bizMessage } = options;

  return sendBizError(res, code || bizCode, message || bizMessage, responseData);
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err: unknown, req: unknown, res: Response, _next: unknown): void {
  sendError(res, err, {
    logLevel: LogLevel.ERROR,
    logMessage: '全局错误处理',
  });
}
