export function sendOk(res, data = null, message = 'ok') {
  return res.json({ code: 0, message, data });
}

export function sendBizError(res, code = 'BUSINESS_ERROR', message = '请求失败', data = null) {
  return res.json({ code, message, data });
}

export function sendHttpError(res, status = 400, code = 'REQUEST_ERROR', message = '请求失败', data = null) {
  return res.status(status).json({ code, message, data });
}

function defaultHttpCode(status) {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REQUEST_ERROR';
}

function defaultHttpMessage(status) {
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
export function sendError(
  res,
  err,
  {
    bizCode = 'BUSINESS_ERROR',
    bizMessage = '请求失败',
    httpCode,
    httpMessage
  } = {}
) {
  const errorInfo = extractErrorInfo(err);
  const responseData = buildResponseData(errorInfo);

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
function extractErrorInfo(err) {
  return {
    status: err?.status,
    code: err?.code,
    message: err?.message,
    data: err?.data ?? null,
    details: err?.details ?? null
  };
}

/**
 * 构建响应数据
 */
function buildResponseData(errorInfo) {
  return errorInfo.details ? { details: errorInfo.details } : errorInfo.data;
}

/**
 * 检查是否为认证相关错误
 */
function isAuthError(status) {
  return status === 401 || status === 403 || status === 429;
}

/**
 * 检查是否为服务器错误
 */
function isServerError(status) {
  return typeof status === 'number' && status >= 500;
}

/**
 * 处理认证相关错误
 */
function handleAuthError(res, errorInfo, options, responseData) {
  const { status, code, message } = errorInfo;
  const { httpCode, httpMessage } = options;

  return sendHttpError(
    res,
    status,
    code || httpCode || defaultHttpCode(status),
    message || httpMessage || defaultHttpMessage(status),
    responseData
  );
}

/**
 * 处理服务器错误
 */
function handleServerError(res, errorInfo, options, responseData) {
  const { status, code, message } = errorInfo;
  const { httpCode, httpMessage } = options;

  return sendHttpError(
    res,
    status,
    code || httpCode || defaultHttpCode(status),
    message || httpMessage || defaultHttpMessage(status),
    responseData
  );
}

/**
 * 处理业务错误
 */
function handleBusinessError(res, errorInfo, options, responseData) {
  const { code, message } = errorInfo;
  const { bizCode, bizMessage } = options;

  return sendBizError(res, code || bizCode, message || bizMessage, responseData);
}
