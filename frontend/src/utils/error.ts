export type ApiErrorData = {
  message?: unknown;
  error?: unknown;
  code?: string;
  details?: any;
};

type ApiErrorResponse = {
  data?: ApiErrorData;
};

export type ApiErrorLike = {
  message?: unknown;
  response?: ApiErrorResponse;
};

export function getApiErrorMessage(err: unknown, fallback = '请求失败') {
  const e = err as ApiErrorLike;

  const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

// 获取完整的 API 错误详情
export function getApiErrorDetails(err: unknown) {
  const e = err as Error & {
    isBusinessError?: boolean;
    code?: number | string;
    response?: any;
  };
  
  // 情况1：如果是业务错误（App.tsx 拦截器处理后的格式）
  if (e.isBusinessError) {
    // 从 response.data 中获取业务错误数据
    const responseData = e.response?.data;
    if (responseData && typeof responseData === 'object') {
      // 提取 code 和 details
      const code = responseData.code;
      let details = responseData.details;
      
      // 如果没有直接的 details 字段，检查 data 字段
      if (!details && responseData.data && typeof responseData.data === 'object') {
        // 如果 data 是一个包含 existingPark 的对象，直接作为 details
        if ('existingPark' in responseData.data) {
          details = responseData.data;
        }
        // 如果 data 包含 details 字段，使用它
        else if ('details' in responseData.data) {
          details = responseData.data.details;
        }
      }
      
      return { code, details };
    }
  }
  
  // 情况2：直接从 response.data 获取（未被拦截器处理的情况）
  const responseData = e?.response?.data;
  if (responseData && typeof responseData === 'object') {
    const code = responseData.code;
    let details = responseData.details;
    
    if (!details && responseData.data && typeof responseData.data === 'object') {
      if ('existingPark' in responseData.data) {
        details = responseData.data;
      }
      else if ('details' in responseData.data) {
        details = responseData.data.details;
      }
    }
    
    return { code, details };
  }
  
  // 情况3：直接返回错误对象的 code 和 message
  return { 
    code: e.code || 'UNKNOWN_ERROR', 
    details: { message: e.message } 
  };
}
