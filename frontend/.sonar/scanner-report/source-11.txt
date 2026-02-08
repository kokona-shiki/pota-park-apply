/**
 * 检查URL格式是否正确
 * @param url - 待验证的URL字符串
 * @returns 如果URL格式正确返回true，否则返回false
 */
export const isValidUrl = (url: string): boolean => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return true; // 空字符串被认为是有效的（可选字段）
  }

  // 如果URL不以http或https开头，添加https://前缀进行验证
  const normalizedUrl =
    trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);
    // 检查协议是否为http或https（不区分大小写）
    const protocol = parsedUrl.protocol.toLowerCase();
    const isHttpOrHttps = protocol === 'http:' || protocol === 'https:';

    // 检查主机名是否有效
    const hostname = parsedUrl.hostname;

    // 检查主机名是否包含至少一个点（除了localhost）或是否为localhost
    const hasValidHostname =
      hostname === 'localhost' ||
      (hostname.includes('.') &&
        hostname !== '.' &&
        hostname !== '..' &&
        !hostname.startsWith('.') &&
        !hostname.endsWith('.') &&
        !/\.\./.test(hostname)); // 不包含连续的点

    // 检查主机名是否包含至少一个字母或数字（基本的有效性检查）
    const hasValidChars = /[a-zA-Z0-9]/.test(hostname);

    return isHttpOrHttps && hasValidHostname && hasValidChars;
  } catch {
    return false;
  }
};

/**
 * 规范化URL格式
 * @param url - 待规范化的URL字符串
 * @returns 规范化后的URL字符串
 */
export const normalizeUrl = (url: string): string => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return url; // 保持原始输入（包括空白字符）
  }

  // 如果URL不以http或https开头，则添加https://前缀
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};
