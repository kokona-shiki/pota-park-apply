import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';
import {
  ParkApplicationSchema,
  ParkApplicationDetailSchema,
  ParkApplicationSubmitRequestSchema,
  AuditLogSchema
} from '../../../shared/schemas/parkApplication';

const parkApplicationService = {
  /**
   * 提交公园申请
   */
  submitApplication: async (data: z.infer<typeof ParkApplicationSubmitRequestSchema>) => {
    return requestWithSchema(
      apiClient.post('/api/park-applications', data),
      ParkApplicationSchema
    );
  },

  /**
   * 获取我的公园申请列表
   */
  getMyApplications: async (status?: string, province?: string) => {
    return requestWithSchema(
      apiClient.get('/api/my-applications', {
        params: { status, province }
      }),
      z.array(ParkApplicationSchema)
    );
  },

  /**
   * 获取公园申请列表（审核员/管理员）
   */
  getApplications: async (status?: string, province?: string, applicantId?: number) => {
    return requestWithSchema(
      apiClient.get('/api/park-applications', {
        params: { status, province, applicantId }
      }),
      z.array(ParkApplicationSchema)
    );
  },

  /**
   * 获取公园申请详情
   */
  getApplicationById: async (id: number) => {
    return requestWithSchema(
      apiClient.get(`/api/park-applications/${id}`),
      ParkApplicationDetailSchema
    );
  },

  /**
   * 审核公园申请
   */
  reviewApplication: async (id: number, data: {
    status: 'approved' | 'rejected';
    reviewNotes?: string;
    rejectionReason?: string | null;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/park-applications/${id}/review`, data),
      ParkApplicationSchema
    );
  },

  /**
   * 重新审核公园申请
   */
  reReviewApplication: async (id: number, data: {
    status: 'approved' | 'rejected';
    reviewNotes?: string;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/park-applications/${id}/re-review`, data),
      ParkApplicationSchema
    );
  },

  /**
   * 录入POTA系统
   */
  syncToPOTA: async (id: number, data: {
    potaNotes?: string;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/park-applications/${id}/sync-pota`, data),
      ParkApplicationSchema
    );
  },

  /**
   * 获取申请审核记录
   */
  getAuditLogs: async (id: number) => {
    return requestWithSchema(
      apiClient.get(`/api/park-applications/${id}/audit-logs`),
      z.array(AuditLogSchema)
    );
  },

  /**
   * 创建审核提醒
   */
  createReviewReminder: async (id: number, data: {
    reminderType: 'general' | 'urgent' | 'escalated';
    notes?: string;
    remindedTo?: number;
  }) => {
    return requestWithSchema(
      apiClient.post(`/api/park-applications/${id}/reminders`, data),
      z.object({
        id: z.number(),
        application_id: z.number(),
        reminder_type: z.string(),
        notes: z.string().nullable(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 获取审核提醒列表
   */
  getReviewReminders: async (applicationId?: number, acknowledged?: boolean) => {
    return requestWithSchema(
      apiClient.get('/api/review-reminders', {
        params: { applicationId, acknowledged }
      }),
      z.array(z.object({
        id: z.number(),
        application_id: z.number(),
        reminder_type: z.string(),
        notes: z.string().nullable(),
        created_at: z.string(),
      }))
    );
  },
};

export default parkApplicationService;
