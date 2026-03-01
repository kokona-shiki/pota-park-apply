import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';

const exportService = {
  /**
   * 导出公园申请数据
   */
  exportParkApplications: async (data: {
    format: 'csv' | 'excel';
    status?: string;
    province?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return requestWithSchema(
      apiClient.post('/api/export/park-applications', data),
      z.object({
        download_url: z.string(),
      })
    );
  },

  /**
   * 导出审核日志
   */
  exportAuditLogs: async (data: {
    format: 'csv' | 'excel';
    start_date?: string;
    end_date?: string;
    action_type?: string;
  }) => {
    return requestWithSchema(
      apiClient.post('/api/export/audit-logs', data),
      z.object({
        download_url: z.string(),
      })
    );
  },

  /**
   * 导出用户数据
   */
  exportUsers: async (data: {
    format: 'csv' | 'excel';
  }) => {
    return requestWithSchema(
      apiClient.post('/api/export/users', data),
      z.object({
        download_url: z.string(),
      })
    );
  },
};

export default exportService;
