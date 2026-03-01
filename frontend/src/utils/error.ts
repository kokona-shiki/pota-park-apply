export type ApiErrorData = {
  message?: unknown;
  error?: unknown;
  code?: string;
  details?: {
    similarParks?: Array<{ id: number; name: string }>;
    nearbyParks?: Array<{ id: number; name: string }>;
    existingPark?: {
      id: number;
      name: string;
      status: string;
    };
    allowRetry?: boolean;
  };
  data?: {
    similarParks?: Array<{ id: number; name: string }>;
    nearbyParks?: Array<{ id: number; name: string }>;
    existingPark?: {
      id: number;
      name: string;
      status: string;
    };
    allowRetry?: boolean;
    details?: {
      similarParks?: Array<{ id: number; name: string }>;
      nearbyParks?: Array<{ id: number; name: string }>;
      existingPark?: {
        id: number;
        name: string;
        status: string;
      };
      allowRetry?: boolean;
    };
  };
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
  const msg = extractMessageFromError(e);
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

function extractMessageFromError(e: ApiErrorLike | undefined): unknown {
  if (!e) return undefined;
  
  const responseData = e?.response?.data;
  if (responseData) {
    return responseData.message ?? responseData.error;
  }
  
  return e?.message;
}

export type ApiErrorDetails = {
  code?: string;
  details?: {
    similarParks?: Array<{ id: number; name: string }>;
    nearbyParks?: Array<{ id: number; name: string }>;
    existingPark?: {
      id: number;
      name: string;
      status: string;
    };
    allowRetry?: boolean;
  };
  existingPark?: {
    id: number;
    name: string;
    status: string;
  };
};

function extractDetailsFromData(data: ApiErrorData | undefined): ApiErrorData['details'] | undefined {
  if (!data) return undefined;
  if (data.details) return data.details;
  if (data.data && typeof data.data === 'object') {
    if ('existingPark' in data.data) return data.data;
    if ('details' in data.data) return data.data.details;
    return data.data;
  }
  return undefined;
}

function extractErrorFromBusinessError(e: Error & {
  isBusinessError?: boolean;
  code?: number | string;
  response?: {
    data?: ApiErrorData;
  };
}): ApiErrorDetails | null {
  if (!e.isBusinessError) return null;
  const responseData = e.response?.data;
  if (responseData && typeof responseData === 'object') {
    const code = responseData.code;
    const details = extractDetailsFromData(responseData);
    return { code, details };
  }
  return null;
}

function extractErrorFromResponse(e: Error & {
  response?: {
    data?: ApiErrorData;
  };
}): ApiErrorDetails | null {
  const responseData = e?.response?.data;
  if (responseData && typeof responseData === 'object') {
    const code = responseData.code;
    const details = extractDetailsFromData(responseData);
    return { code, details };
  }
  return null;
}

export function getApiErrorDetails(err: unknown): ApiErrorDetails {
  const e = err as Error & {
    isBusinessError?: boolean;
    code?: number | string;
    response?: {
      data?: ApiErrorData;
    };
  };

  const businessError = extractErrorFromBusinessError(e);
  if (businessError) return businessError;

  const responseError = extractErrorFromResponse(e);
  if (responseError) return responseError;

  return {
    code: typeof e.code === 'string' ? e.code : 'UNKNOWN_ERROR',
    details: undefined,
  };
}