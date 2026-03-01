import { apiClient, requestWithSchema } from './apiClient';
import { z } from 'zod';
import { AuthUserSchema } from '../../../shared/schemas/auth';

const userService = {
  /**
   * 获取用户列表
   */
  getUsers: async () => {
    return requestWithSchema(
      apiClient.get('/api/users'),
      z.array(AuthUserSchema)
    );
  },

  /**
   * 修改用户信息
   */
  updateUser: async (userId: number, data: {
    email?: string;
    callsign?: string;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/users/${userId}`, data),
      AuthUserSchema
    );
  },

  /**
   * 修改用户角色
   */
  updateUserRole: async (userId: number, data: {
    role: string;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/users/${userId}/role`, data),
      AuthUserSchema
    );
  },

  /**
   * 申请呼号变更
   */
  submitCallsignChangeRequest: async (data: {
    new_callsign: string;
    reason: string;
  }) => {
    return requestWithSchema(
      apiClient.post('/api/callsign-change-requests', data),
      z.object({
        id: z.number(),
        user_id: z.number(),
        old_callsign: z.string(),
        new_callsign: z.string(),
        status: z.string(),
        created_at: z.string(),
      })
    );
  },

  /**
   * 获取呼号变更申请列表
   */
  getCallsignChangeRequests: async () => {
    return requestWithSchema(
      apiClient.get('/api/callsign-change-requests'),
      z.array(z.object({
        id: z.number(),
        user_id: z.number(),
        user_email: z.string(),
        old_callsign: z.string(),
        new_callsign: z.string(),
        status: z.string(),
        created_at: z.string(),
      }))
    );
  },

  /**
   * 审核呼号变更申请
   */
  reviewCallsignChangeRequest: async (requestId: number, data: {
    status: 'approved' | 'rejected';
    review_notes?: string;
  }) => {
    return requestWithSchema(
      apiClient.put(`/api/callsign-change-requests/${requestId}/review`, data),
      z.object({
        id: z.number(),
        status: z.string(),
      })
    );
  },
};

export default userService;
