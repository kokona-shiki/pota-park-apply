import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import type { PotaPark } from './types.js';

// POTA API 基础 URL
export const POTA_API_BASE_URL = 'https://api.pota.app';
export const QUERY_PARK_MAX_RETRIES = 3;
export const QUERY_PARK_MIN_DELAY_MS = 1000;
export const QUERY_PARK_MAX_DELAY_MS = 3000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRandomDelayMs = () =>
  Math.floor(Math.random() * (QUERY_PARK_MAX_DELAY_MS - QUERY_PARK_MIN_DELAY_MS + 1)) +
  QUERY_PARK_MIN_DELAY_MS;

const applyQueryParkDelay = async () => {
  const delay = getRandomDelayMs();
  await sleep(delay);
};

type ErrorResponse = {
  status?: number;
  data?: unknown;
};

type ErrorLike = {
  message?: string;
  response?: ErrorResponse;
};

const formatQueryParkError = (error: unknown) => {
  if (!error) {
    return '未知错误';
  }
  const errorLike = error as ErrorLike;
  if (errorLike.response) {
    const status = errorLike.response.status;
    const data = errorLike.response.data;
    let detail = '';
    if (typeof data === 'string') {
      detail = data;
    } else if (data) {
      detail = JSON.stringify(data);
    } else if (errorLike.message) {
      detail = errorLike.message;
    }
    const suffix = detail ? ` - ${detail}` : '';
    return `HTTP ${status}${suffix}`;
  }
  return errorLike.message || '未知错误';
};

export const buildQueryParkFailureReason = (attempts: number, error: unknown) =>
  `查询 POTA 公园 失败（${attempts}/${QUERY_PARK_MAX_RETRIES}次）：${formatQueryParkError(error)}`;

/**
 * 从 POTA API 获取所有中国公园数据
 */
export const fetchAllChineseParks = async (): Promise<PotaPark[]> => {
  try {
    console.log('开始从 POTA API 获取中国公园数据...');

    // 使用正确的 API 端点: /entity/parks/318
    // 后端可以直接访问外部 API，不需要代理
    // 实现带重试机制的请求
    let lastError;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${POTA_API_BASE_URL}/entity/parks/318`, {
          timeout: 30000,
          // 添加更多连接选项以处理网络问题
          httpAgent: new http.Agent({ keepAlive: true }),
          httpsAgent: new https.Agent({ keepAlive: true }),
          headers: {
            'User-Agent': 'POTA-Park-Importer/1.0',
            Accept: 'application/json',
          },
        });

        if (response && Array.isArray(response.data)) {
          console.log(`成功获取 ${response.data.length} 个中国公园数据 (第 ${attempt} 次尝试)`);
          return response.data;
        }
      } catch (error) {
        lastError = error;
        console.log(`获取 POTA 公园数据失败 (第 ${attempt} 次尝试): ${error.message}`);

        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          console.log(`等待 ${delay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 如果所有重试都失败，抛出最后一个错误
    throw lastError;
  } catch (error) {
    console.error('获取 POTA 公园数据失败:', error.message);

    // 如果所有重试都失败，记录详细错误并抛出异常
    console.error('POTA API 连接失败，无法获取数据:', error);

    // 为了系统的健壮性，返回空数组而不是抛出异常
    // 这样可以让导入过程继续，只是没有新公园被导入
    console.log('返回空数组，因为无法连接到 POTA API');
    return [];
  }
};

/**
 * 查询 POTA 公园详情
 */
export const fetchPotaParkDetail = async (reference: string) => {
  let lastError;

  for (let attempt = 1; attempt <= QUERY_PARK_MAX_RETRIES; attempt++) {
    try {
      await applyQueryParkDelay();
      const response = await axios.get(`${POTA_API_BASE_URL}/park/${reference}`, {
        timeout: 30000,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
        headers: {
          'User-Agent': 'POTA-Park-Importer/1.0',
          Accept: 'application/json',
          Referer: 'https://pota.app/',
        },
      });

      if (response?.data) {
        return { data: response.data as PotaPark, attempts: attempt };
      }
    } catch (error) {
      lastError = error;
      console.log(
        `查询 POTA 公园失败 (第 ${attempt} 次尝试, ${reference}): ${formatQueryParkError(error)}`
      );
    }
  }

  const error = new Error(buildQueryParkFailureReason(QUERY_PARK_MAX_RETRIES, lastError));
  error.cause = lastError;
  throw error;
};

export const getPotaReference = (park: PotaPark) =>
  park?.reference || park?.potaId || park?.pota_ref || park?.potaRef || '';
