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
  const status = err?.status;
  const code = err?.code;
  const message = err?.message;
  const data = err?.data ?? null;

  if (status === 401 || status === 403 || status === 429) {
    return sendHttpError(
      res,
      status,
      code || httpCode || defaultHttpCode(status),
      message || httpMessage || defaultHttpMessage(status),
      data
    );
  }

  if (typeof status === 'number' && status >= 500) {
    return sendHttpError(
      res,
      status,
      code || httpCode || defaultHttpCode(status),
      message || httpMessage || defaultHttpMessage(status),
      data
    );
  }

  return sendBizError(res, code || bizCode, message || bizMessage, data);
}
