import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';

const potaService = {
  /**
   * 初始化 POTA 认证
   */
  initAuth: async () => {
    return requestWithSchema(
      apiClient.post('/api/pota/init-auth'),
      z.object({
        authUrl: z.string(),
      })
    );
  },

  /**
   * 获取 POTA 认证状态
   */
  getAuthStatus: async () => {
    return requestWithSchema(
      apiClient.get('/api/pota/status'),
      z.object({
        isAuthenticated: z.boolean(),
        expiresAt: z.string().nullable(),
      })
    );
  },

  /**
   * 获取 POTA token（自动刷新）
   */
  getToken: async () => {
    return requestWithSchema(
      apiClient.get('/api/pota/token'),
      z.object({
        token: z.string(),
        expiresAt: z.string(),
      })
    );
  },

  /**
   * 断开 POTA 连接
   */
  disconnect: async () => {
    return requestWithSchema(
      apiClient.delete('/api/pota/token'),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 手动触发 POTA 公园导入
   */
  triggerImport: async () => {
    return requestWithSchema(
      apiClient.post('/api/pota/import'),
      z.object({
        taskId: z.string(),
      })
    );
  },

  /**
   * 获取导入权限状态
   */
  getImportStatus: async () => {
    return requestWithSchema(
      apiClient.get('/api/pota/import-status'),
      z.object({
        hasPermission: z.boolean(),
      })
    );
  },

  /**
   * 获取最新导入任务
   */
  getLatestImportTask: async () => {
    return requestWithSchema(
      apiClient.get('/api/pota/import-task/latest'),
      z.object({
        id: z.string(),
        status: z.string(),
        progress: z.number(),
        total: z.number(),
        processed: z.number(),
        failed: z.number(),
        started_at: z.string(),
        completed_at: z.string().nullable(),
      })
    );
  },

  /**
   * 获取未处理公园
   */
  getUnprocessedParks: async () => {
    return requestWithSchema(
      apiClient.get('/api/pota/unprocessed-parks'),
      z.array(z.object({
        id: z.number(),
        pota_id: z.string(),
        park_name: z.string(),
        country_code: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        pota_type: z.string(),
        processed: z.boolean(),
      }))
    );
  },

  /**
   * 处理未处理公园
   */
  processUnprocessedPark: async (id: number, data: {
    action: 'accept' | 'reject';
    notes?: string;
  }) => {
    return requestWithSchema(
      apiClient.post(`/api/pota/process-unprocessed-park`, {
        id,
        ...data
      }),
      z.object({
        success: z.boolean(),
      })
    );
  },

  /**
   * 批量处理未处理公园
   */
  bulkProcessUnprocessedParks: async (data: {
    ids: number[];
    action: 'accept' | 'reject';
    notes?: string;
  }) => {
    return requestWithSchema(
      apiClient.post('/api/pota/bulk-process-unprocessed-parks', data),
      z.object({
        success: z.boolean(),
        processed: z.number(),
      })
    );
  },

  /**
   * 获取 POTA 同步日志
   */
  getSyncLogs: async (limit?: number, offset?: number) => {
    return requestWithSchema(
      apiClient.get('/api/pota/sync-logs', {
        params: { limit, offset }
      }),
      z.array(z.object({
        id: z.number(),
        action: z.string(),
        status: z.string(),
        message: z.string().nullable(),
        created_at: z.string(),
      }))
    );
  },
};

export default potaService;
