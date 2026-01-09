type ApiErrorData = {
  message?: unknown;
  error?: unknown;
};

type ApiErrorResponse = {
  data?: ApiErrorData;
};

type ApiErrorLike = {
  message?: unknown;
  response?: ApiErrorResponse;
};

export function getApiErrorMessage(err: unknown, fallback = '请求失败') {
  const e = err as ApiErrorLike;

  const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
