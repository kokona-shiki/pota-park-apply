function normalizeUrlForValidation(url: string): string {
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

function isValidProtocol(protocol: string): boolean {
  const normalizedProtocol = protocol.toLowerCase();
  return normalizedProtocol === 'http:' || normalizedProtocol === 'https:';
}

function isValidHostname(hostname: string): boolean {
  if (hostname === 'localhost') {
    return true;
  }

  const hasDot = hostname.includes('.');
  const isNotSingleDot = hostname !== '.';
  const isNotDoubleDot = hostname !== '..';
  const isNotStartWithDot = !hostname.startsWith('.');
  const isNotEndWithDot = !hostname.endsWith('.');
  const hasNoConsecutiveDots = !/\.\./.test(hostname);

  return (
    hasDot &&
    isNotSingleDot &&
    isNotDoubleDot &&
    isNotStartWithDot &&
    isNotEndWithDot &&
    hasNoConsecutiveDots
  );
}

export const isValidUrl = (url: string): boolean {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return true;
  }

  const normalizedUrl = normalizeUrlForValidation(trimmedUrl);

  try {
    const parsedUrl = new URL(normalizedUrl);
    const protocol = parsedUrl.protocol;
    const hostname = parsedUrl.hostname;

    const isHttpOrHttps = isValidProtocol(protocol);
    const hasValidHostname = isValidHostname(hostname);
    const hasValidChars = /[a-zA-Z0-9]/.test(hostname);

    return isHttpOrHttps && hasValidHostname && hasValidChars;
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return url;
  }

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};